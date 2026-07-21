package com.areto.app;

import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Renders the given HTML in an offscreen WebView and hands it to Android's
// native print pipeline, so "download as PDF" goes through the system's own
// "Save as PDF" printer — the same one every app uses — instead of faking a
// download with a text share. Handles RTL Hebrew correctly because it's the
// real Chromium engine doing the layout, not a hand-rolled PDF writer.
//
// A fully silent, dialog-free export (rendering the page into a PdfDocument
// by hand and writing straight to Downloads) was tried and reverted: on this
// device's WebView build, capturing the WebView's pixels via draw(Canvas)
// either produced a blank page or corrupted GPU-texture garbage depending on
// hardware/software layer timing, with no reliable fix found. PrintManager
// delegates the actual rendering to Android's own tested print pipeline
// instead of hand-capturing pixels, so it doesn't hit that failure mode —
// the tradeoff is the user taps "Save as PDF" in the system dialog rather
// than the file appearing with zero taps.
@CapacitorPlugin(name = "PrintPdf")
public class PrintPdfPlugin extends Plugin {

    @PluginMethod
    public void printHtml(PluginCall call) {
        String html = call.getString("html");
        if (html == null || html.isEmpty()) {
            call.reject("Missing html");
            return;
        }
        String jobName = call.getString("jobName", "Areto");

        getActivity().runOnUiThread(() -> {
            WebView printWebView = new WebView(getContext());
            printWebView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    PrintManager printManager =
                        (PrintManager) getContext().getSystemService(android.content.Context.PRINT_SERVICE);
                    if (printManager == null) {
                        call.reject("Print service unavailable");
                        return;
                    }
                    printManager.print(
                        jobName,
                        view.createPrintDocumentAdapter(jobName),
                        new PrintAttributes.Builder().build()
                    );
                    JSObject ret = new JSObject();
                    ret.put("value", true);
                    call.resolve(ret);
                }
            });
            printWebView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
        });
    }
}
