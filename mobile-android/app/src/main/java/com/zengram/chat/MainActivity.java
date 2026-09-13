package com.zengram.chat;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

/**
 * ZenGram Android Client — 100% Open-Source & Transparent
 * 
 * Features:
 * - Direct Messages & Calls only (No algorithmic feeds, no explore, no reels swipe trap)
 * - Saved Section enabled for study notes & diagrams
 * - Creator Upload Support (Native photo/video file picker via onShowFileChooser)
 * - WebRTC Audio & Video Calling auto-permission handling
 * - Zero Telemetry: 100% direct connection to official Instagram SSL servers
 */
public class MainActivity extends Activity {

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private static final String INBOX_URL = "https://www.instagram.com/direct/inbox/";
    private static final int PERMISSION_REQUEST_CODE = 101;
    private static final int FILE_CHOOSER_RESULT_CODE = 102;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Auto-request Camera & Audio permissions for Calling
        checkMediaPermissions();

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // WebChromeClient handles WebRTC calling permissions & Creator File Uploads
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    // Auto-grant Camera and Microphone for video/voice calling
                    request.grant(request.getResources());
                });
            }

            // Creator Support: Enables posting photos/reels/stories without opening feed
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;

                Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILE_CHOOSER_RESULT_CODE);
                } catch (Exception e) {
                    MainActivity.this.filePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        // WebViewClient enforces Distraction-Free routing
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Uri uri = Uri.parse(url);
                String path = uri.getPath();
                if (path == null) path = "";

                // Explicitly allowed: Saved section, DMs, Creator upload, Single post
                if (path.contains("/saved") || path.startsWith("/direct") || path.startsWith("/create") || path.startsWith("/p/")) {
                    return false;
                }

                // Strictly blocked: Home Feed, Explore, and Algorithmic Reels tabs
                if (path.equals("/") || path.startsWith("/explore") || path.equals("/reels") || path.equals("/reels/")) {
                    view.loadUrl(INBOX_URL);
                    return true;
                }

                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                injectZenGramScript(view);
            }
        });

        webView.loadUrl(INBOX_URL);
    }

    private void checkMediaPermissions() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO},
                    PERMISSION_REQUEST_CODE);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            if (filePathCallback != null) {
                Uri[] results = null;
                if (resultCode == Activity.RESULT_OK && data != null) {
                    if (data.getData() != null) {
                        results = new Uri[]{data.getData()};
                    } else if (data.getClipData() != null) {
                        int count = data.getClipData().getItemCount();
                        results = new Uri[count];
                        for (int i = 0; i < count; i++) {
                            results[i] = data.getClipData().getItemAt(i).getUri();
                        }
                    }
                }
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    private void injectZenGramScript(WebView view) {
        String js = "(function() {" +
                "  var s = document.createElement('style');" +
                "  s.textContent = 'a[href=\"/\"], a[href=\"/explore/\"], a[href=\"/reels/\"], div[role=\"navigation\"] a[href=\"/\"], div[role=\"navigation\"] a[href=\"/explore/\"], div[role=\"navigation\"] a[href=\"/reels/\"], footer, div[role=\"complementary\"] { display: none !important; }';" +
                "  document.head.appendChild(s);" +
                "  var path = window.location.pathname;" +
                "  if (path === '/' || path.startsWith('/explore') || (path.startsWith('/reels') && !path.includes('/reel/'))) {" +
                "    window.location.replace('" + INBOX_URL + "');" +
                "  }" +
                "})();";
        view.evaluateJavascript(js, null);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            String curUrl = webView.getUrl();
            if (curUrl != null && (curUrl.contains("/direct/t/") || curUrl.contains("/saved") || curUrl.contains("/p/"))) {
                // If inside a conversation or saved post, go back to inbox
                webView.loadUrl(INBOX_URL);
            } else if (curUrl != null && !curUrl.equals(INBOX_URL)) {
                webView.loadUrl(INBOX_URL);
            } else {
                super.onBackPressed();
            }
        } else {
            super.onBackPressed();
        }
    }
}
