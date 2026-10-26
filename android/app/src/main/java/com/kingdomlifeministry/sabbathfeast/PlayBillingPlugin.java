package com.kingdomlifeministry.sabbathfeast;

import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageInfo;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Collections;
import java.util.List;

// The one-time "full_unlock" purchase through Google Play, plus the install date
// the free trial counts from. Google handles the payment; the app only learns
// whether the unlock is owned.
@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin {

    static final String PRODUCT_ID = "full_unlock";

    private BillingClient client;
    private PluginCall buyCall;

    @Override
    public void load() {
        client = BillingClient.newBuilder(getContext())
            .setListener(this::onPurchasesUpdated)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .build();
    }

    // ---------- connection ----------
    private interface Ready { void run(); }

    private void whenReady(PluginCall call, Ready ready) {
        if (client.isReady()) { ready.run(); return; }
        client.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) ready.run();
                else call.reject("Google Play billing is not available", "unavailable");
            }
            @Override
            public void onBillingServiceDisconnected() { /* reconnects on the next call */ }
        });
    }

    // ---------- install date (the trial counts from here; survives clearing app data) ----------
    @PluginMethod
    public void getInstallTime(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            Context c = getContext();
            PackageInfo info = c.getPackageManager().getPackageInfo(c.getPackageName(), 0);
            ret.put("firstInstall", info.firstInstallTime);
        } catch (Exception e) {
            ret.put("firstInstall", 0);
        }
        call.resolve(ret);
    }

    // ---------- does this Google account own the unlock? ----------
    @PluginMethod
    public void getStatus(PluginCall call) {
        whenReady(call, () -> client.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
            (result, purchases) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Could not check purchases", "unavailable");
                    return;
                }
                call.resolve(summarize(purchases));
            }));
    }

    // ---------- the store price, in the buyer's own currency ----------
    @PluginMethod
    public void getPrice(PluginCall call) {
        whenReady(call, () -> queryProduct(call, (details) -> {
            JSObject ret = new JSObject();
            List<ProductDetails.OneTimePurchaseOfferDetails> offers = details.getOneTimePurchaseOfferDetailsList();
            ret.put("price", (offers != null && !offers.isEmpty()) ? offers.get(0).getFormattedPrice() : "");
            call.resolve(ret);
        }));
    }

    // ---------- buy the unlock ----------
    @PluginMethod
    public void buy(PluginCall call) {
        whenReady(call, () -> queryProduct(call, (details) -> {
            Activity activity = getActivity();
            if (activity == null) { call.reject("No screen to show the purchase on", "error"); return; }
            BillingFlowParams params = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(
                    BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details).build()))
                .build();
            call.setKeepAlive(true);
            buyCall = call;
            activity.runOnUiThread(() -> {
                BillingResult r = client.launchBillingFlow(activity, params);
                if (r.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    finishBuy(null, r.getResponseCode());
                }
            });
        }));
    }

    private void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        finishBuy(purchases, result.getResponseCode());
    }

    private void finishBuy(List<Purchase> purchases, int code) {
        PluginCall call = buyCall;
        buyCall = null;
        JSObject ret = (code == BillingClient.BillingResponseCode.OK || code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED)
            ? summarize(purchases) : new JSObject();
        if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) ret.put("owned", true);
        if (code == BillingClient.BillingResponseCode.USER_CANCELED) ret.put("canceled", true);
        if (code != BillingClient.BillingResponseCode.OK
            && code != BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED
            && code != BillingClient.BillingResponseCode.USER_CANCELED) ret.put("failed", true);
        if (call != null) {
            call.setKeepAlive(false);
            call.resolve(ret);
        }
    }

    // ---------- helpers ----------
    private interface GotProduct { void run(ProductDetails details); }

    private void queryProduct(PluginCall call, GotProduct got) {
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(Collections.singletonList(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(PRODUCT_ID)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build()))
            .build();
        client.queryProductDetailsAsync(params, (result, queryResult) -> {
            List<ProductDetails> list = queryResult.getProductDetailsList();
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || list == null || list.isEmpty()) {
                call.reject("The unlock is not available in the store yet", "noproduct");
                return;
            }
            got.run(list.get(0));
        });
    }

    // Owned or pending, and acknowledge new purchases (Google refunds any left unacknowledged after 3 days).
    private JSObject summarize(List<Purchase> purchases) {
        boolean owned = false;
        boolean pending = false;
        if (purchases != null) {
            for (Purchase p : purchases) {
                if (!p.getProducts().contains(PRODUCT_ID)) continue;
                if (p.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                    owned = true;
                    if (!p.isAcknowledged()) {
                        client.acknowledgePurchase(
                            AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.getPurchaseToken()).build(),
                            (r) -> { /* checked again on the next getStatus */ });
                    }
                } else if (p.getPurchaseState() == Purchase.PurchaseState.PENDING) {
                    pending = true;
                }
            }
        }
        JSObject ret = new JSObject();
        ret.put("owned", owned);
        ret.put("pending", pending);
        return ret;
    }
}
