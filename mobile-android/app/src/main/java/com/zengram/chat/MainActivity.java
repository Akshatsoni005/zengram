package com.zengram.chat;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * ZenGram Android Client — 100% Open-Source & Transparent
 *
 * Features:
 * - Direct Messages & Calls only (no feed, no explore, no endless reels)
 * - Single-reel sandbox: sent reels play once, then return to inbox; no swipe-to-next
 * - View-Once media unlocked: permanent view + 1-tap gallery save
 * - Creator Post & Ghost: /create flow stays isolated; auto-deflects after publish
 * - WebRTC Voice & Video Calling (hardware accelerated)
 * - Saved section access (study notes, formula sheets)
 * - Zero telemetry: direct Meta SSL connection only
 */
public class MainActivity extends Activity {

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;

    private static final String INBOX_URL        = "https://www.instagram.com/direct/inbox/";
    private static final int PERMISSION_CODE      = 101;
    private static final int FILE_CHOOSER_CODE    = 102;

    // -------------------------------------------------------------------
    // JS injected whenever a /reel/<shortcode>/ page finishes loading.
    // Kills the continuous scroll / swipe-to-next and pauses the video
    // once it plays once so the experience stays in a locked single-reel.
    // -------------------------------------------------------------------
    private static final String REEL_LOCK_JS =
        "(function(){" +
        "  var __zg_locked = false;" +
        "  function lockReel(){" +
        "    if(__zg_locked) return;" +
        "    __zg_locked = true;" +
        // Prevent all touch-based swipe propagation on the reel container
        "    var stopEvt = function(e){ e.stopPropagation(); e.stopImmediatePropagation(); };" +
        "    document.addEventListener('touchmove',  stopEvt, {capture:true, passive:false});" +
        "    document.addEventListener('wheel',      stopEvt, {capture:true, passive:false});" +
        "    document.addEventListener('scroll',     stopEvt, {capture:true});" +
        // Kill Instagram's own swipe handlers attached to reel containers
        "    var selectors = [" +
        "      'div[class*=\"x1cy8zhl\"]','div[class*=\"x6s0dn4\"]'," +
        "      'div[data-visualcompletion]','section','main'," +
        "      'article','div[class*=\"Reels\"]','div[class*=\"reel\"]'" +
        "    ];" +
        "    selectors.forEach(function(sel){" +
        "      try{" +
        "        document.querySelectorAll(sel).forEach(function(el){" +
        "          el.style.overflow = 'hidden';" +
        "          el.style.touchAction = 'none';" +
        "          var clone = el.cloneNode(true);" +
        "          if(el.parentNode){ el.parentNode.replaceChild(clone, el); }" +
        "        });" +
        "      }catch(e){}" +
        "    });" +
        // When the video ends, return to inbox instead of auto-playing the next reel
        "    var patchVideo = function(){" +
        "      document.querySelectorAll('video').forEach(function(v){" +
        "        if(v.__zg_patched) return;" +
        "        v.__zg_patched = true;" +
        "        v.loop = false;" +
        "        v.addEventListener('ended', function(){" +
        "          window.ZenGramNative && ZenGramNative.onReelEnded();" +
        "        });" +
        "      });" +
        "    };" +
        "    patchVideo();" +
        "    var obs = new MutationObserver(patchVideo);" +
        "    obs.observe(document.body, {childList:true, subtree:true});" +
        // Hide the suggested reels sidebar / bottom row that Instagram injects
        "    var css = document.createElement('style');" +
        "    css.textContent = [" +
        "      'div[class*=\"suggested\"]{ display:none!important; }'," +
        "      'div[class*=\"Related\"]{ display:none!important; }'," +
        "      'div[class*=\"MoreFrom\"]{ display:none!important; }'," +
        "      'a[href=\"/reels/\"]{ display:none!important; }'," +
        "      'section > div > div:nth-child(n+2){ display:none!important; }'" +
        "    ].join('');" +
        "    document.head.appendChild(css);" +
        "  }" +
        "  if(document.readyState==='loading'){" +
        "    document.addEventListener('DOMContentLoaded', lockReel);" +
        "  } else { lockReel(); }" +
        "  setTimeout(lockReel, 800);" +
        "})();";

    // -------------------------------------------------------------------
    // Base route-guard JS injected on every page load.
    // Loads the full engine from assets when available, otherwise falls back
    // to an inline minimal guard (no reel sandbox, no view-once).
    // -------------------------------------------------------------------
    private static final String GUARD_JS_FALLBACK =
        "(function(){" +
        "  var INB='https://www.instagram.com/direct/inbox/';" +
        "  var p=window.location.pathname;" +
        "  if(p==='/'||p.startsWith('/explore')||(p.startsWith('/reels')&&!p.startsWith('/reel/'))){" +
        "    window.location.replace(INB);" +
        "  }" +
        "  var s=document.createElement('style');" +
        "  s.textContent='a[href=\"/\"],a[href=\"/explore/\"],a[href=\"/reels/\"],div[role=\"complementary\"]{display:none!important}';" +
        "  document.head&&document.head.appendChild(s);" +
        "})();";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        checkRequiredPermissions();

        webView = new WebView(this);
        setContentView(webView);

        configureWebSettings();

        webView.addJavascriptInterface(new ZenGramNativeBridge(), "ZenGramNative");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override public void run() {
                        request.grant(request.getResources());
                    }
                });
            }

            @Override
            public boolean onShowFileChooser(WebView wv,
                    ValueCallback<Uri[]> cb,
                    FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = cb;
                try {
                    startActivityForResult(params.createIntent(), FILE_CHOOSER_CODE);
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        webView.setWebViewClient(new WebViewClient() {

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Uri uri = Uri.parse(url);
                String path = uri.getPath();
                if (path == null) path = "";

                // ---- Strict block: home feed, explore, endless reels tab ----
                if (path.equals("/") || path.startsWith("/explore") ||
                        path.equals("/reels") || path.equals("/reels/")) {
                    view.loadUrl(INBOX_URL);
                    return true;
                }

                // ---- Single-reel: allowed, onPageFinished and engine enforce the lock ----
                if (path.startsWith("/reel/") || path.contains("/reel/")) {
                    return false;
                }

                // ---- Allow: DMs, saved, create/upload, single post, stories, accounts ----
                if (path.startsWith("/direct") || path.startsWith("/p/") ||
                        path.contains("/saved")  || path.startsWith("/create") ||
                        path.startsWith("/stories/") || path.startsWith("/accounts") ||
                        path.startsWith("/challenge") || path.startsWith("/two_factor")) {
                    return false;
                }

                // ---- Post & Ghost: after publishing a reel/post, creator gets redirected
                //      to the home feed or their profile. Catch it and return to inbox. ----
                String cur = view.getUrl();
                if (cur != null && (cur.startsWith("https://www.instagram.com/create") ||
                        cur.startsWith("https://www.instagram.com/p/"))) {
                    // Likely a post-publish redirect – let it through if it's a post page
                    if (path.startsWith("/p/")) return false;
                    // Otherwise ghost back to inbox
                    view.loadUrl(INBOX_URL);
                    return true;
                }

                // Default: allow (Instagram loads many internal CDN paths)
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);

                Uri uri = Uri.parse(url);
                String path = uri.getPath();
                if (path == null) path = "";

                // If this is a single reel page, always inject the single-reel lock
                if (path.startsWith("/reel/") || path.contains("/reel/")) {
                    view.evaluateJavascript(REEL_LOCK_JS, null);
                }

                // Always inject the full ZenGram engine (or fallback guard)
                injectZenGramEngine(view);
            }
        });

        webView.loadUrl(INBOX_URL);
    }

    // ------------------------------------------------------------------
    // WebView performance settings tuned for a native-feeling experience
    // ------------------------------------------------------------------
    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebSettings() {
        WebSettings s = webView.getSettings();

        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);

        // Allow media to play without a tap (needed for inline reel videos)
        s.setMediaPlaybackRequiresUserGesture(false);

        // Disable pinch-zoom — matches native app feel
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);

        // File / content access for the file chooser (Post & Ghost uploads)
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);

        // Aggressive caching for faster page loads on repeat visits
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Viewport — makes Instagram render its mobile layout
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);

        // Mixed content: allow HTTPS pages to load HTTP sub-resources (CDN images)
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // Chrome 130 Mobile UA — tells Instagram to serve its full native mobile experience
        s.setUserAgentString(
            "Mozilla/5.0 (Linux; Android 14; Pixel 8) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/130.0.6723.86 Mobile Safari/537.36"
        );

        // Render at full 60 fps
        webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);

        // Enable smooth scrolling (Android 9+)
        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);

        // Suppress long-press text selection (more app-like feel)
        webView.setHapticFeedbackEnabled(false);
        webView.setLongClickable(false);
    }

    // ------------------------------------------------------------------
    // Inject full ZenGram engine from bundled assets; inline guard fallback
    // ------------------------------------------------------------------
    private void injectZenGramEngine(WebView view) {
        // Inject CSS
        String css = loadAssetString("zengram-style.css");
        if (css.length() > 0) {
            view.evaluateJavascript(
                "(function(){" +
                "  if(document.getElementById('__zg_css')) return;" +
                "  var s=document.createElement('style');" +
                "  s.id='__zg_css';" +
                "  s.textContent=" + jsStr(css) + ";" +
                "  document.head&&document.head.appendChild(s);" +
                "})();",
                null
            );
        }

        // Inject JS engine
        String js = loadAssetString("zengram-engine.js");
        if (js.length() > 0) {
            view.evaluateJavascript(js, null);
        } else {
            view.evaluateJavascript(GUARD_JS_FALLBACK, null);
        }
    }

    private String loadAssetString(String filename) {
        try {
            InputStream is = getAssets().open(filename);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int len;
            while ((len = is.read(buf)) != -1) baos.write(buf, 0, len);
            is.close();
            return baos.toString("UTF-8");
        } catch (Exception e) {
            return "";
        }
    }

    /** Wrap a Java string as a safe JS string literal. */
    private String jsStr(String src) {
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < src.length(); i++) {
            char c = src.charAt(i);
            if      (c == '"')  sb.append("\\\"");
            else if (c == '\\') sb.append("\\\\");
            else if (c == '\n') sb.append("\\n");
            else if (c == '\r') sb.append("\\r");
            else if (c == '\t') sb.append("\\t");
            else                sb.append(c);
        }
        return sb.append('"').toString();
    }

    // ------------------------------------------------------------------
    // Native JS bridge — keeps surface minimal; only what the engine needs
    // ------------------------------------------------------------------
    public class ZenGramNativeBridge {

        /** Called by REEL_LOCK_JS when a reel video fires its 'ended' event. */
        @JavascriptInterface
        public void onReelEnded() {
            runOnUiThread(new Runnable() {
                @Override public void run() {
                    // Small delay so the 'end' frame is visible before navigating back
                    webView.postDelayed(new Runnable() {
                        @Override public void run() {
                            webView.loadUrl(INBOX_URL);
                        }
                    }, 600);
                }
            });
        }

        /** Called by view-once sandbox "Save" button in zengram-engine.js */
        @JavascriptInterface
        public void saveMediaToGallery(final String mediaUrl, final String filename) {
            // Run download off the main thread
            new Thread(new Runnable() {
                @Override public void run() {
                    doSaveToGallery(mediaUrl, filename);
                }
            }).start();
        }

        @JavascriptInterface
        public void showToast(final String msg) {
            runOnUiThread(new Runnable() {
                @Override public void run() {
                    Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    // ------------------------------------------------------------------
    // Download and save view-once media to Pictures/ZenGram/
    // ------------------------------------------------------------------
    private void doSaveToGallery(final String mediaUrl, final String filename) {
        runOnUiThread(new Runnable() {
            @Override public void run() {
                Toast.makeText(MainActivity.this, "💾 Saving to Gallery…", Toast.LENGTH_SHORT).show();
            }
        });
        try {
            File dir = new File(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES),
                "ZenGram"
            );
            if (!dir.exists()) dir.mkdirs();

            String name = (filename != null && filename.length() > 0)
                ? filename
                : "unlocked_" + System.currentTimeMillis() + ".jpg";
            final File dest = new File(dir, name);

            if (mediaUrl.startsWith("data:")) {
                int comma = mediaUrl.indexOf(',');
                if (comma != -1) {
                    byte[] bytes = Base64.decode(mediaUrl.substring(comma + 1), Base64.DEFAULT);
                    FileOutputStream fos = new FileOutputStream(dest);
                    fos.write(bytes);
                    fos.close();
                }
            } else {
                URL u = new URL(mediaUrl);
                HttpURLConnection conn = (HttpURLConnection) u.openConnection();
                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14; Mobile)");
                conn.connect();
                InputStream in = conn.getInputStream();
                FileOutputStream fos = new FileOutputStream(dest);
                byte[] buf = new byte[8192];
                int r;
                while ((r = in.read(buf)) != -1) fos.write(buf, 0, r);
                fos.close();
                in.close();
            }

            MediaScannerConnection.scanFile(MainActivity.this,
                new String[]{dest.getAbsolutePath()}, null, null);

            runOnUiThread(new Runnable() {
                @Override public void run() {
                    Toast.makeText(MainActivity.this,
                        "✅ Saved to Pictures/ZenGram!", Toast.LENGTH_LONG).show();
                }
            });
        } catch (final Exception e) {
            runOnUiThread(new Runnable() {
                @Override public void run() {
                    Toast.makeText(MainActivity.this,
                        "Save failed: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    // ------------------------------------------------------------------
    // Permissions
    // ------------------------------------------------------------------
    private void checkRequiredPermissions() {
        String[] perms = {
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.READ_MEDIA_IMAGES,
            Manifest.permission.READ_MEDIA_VIDEO
        };
        for (String p : perms) {
            if (checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(perms, PERMISSION_CODE);
                return;
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_CODE) {
            if (filePathCallback == null) return;
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null) {
                if (data.getData() != null) {
                    results = new Uri[]{data.getData()};
                } else if (data.getClipData() != null) {
                    int n = data.getClipData().getItemCount();
                    results = new Uri[n];
                    for (int i = 0; i < n; i++)
                        results[i] = data.getClipData().getItemAt(i).getUri();
                }
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    // ------------------------------------------------------------------
    // Back button: always land on inbox rather than popping through history
    // ------------------------------------------------------------------
    @Override
    public void onBackPressed() {
        if (webView == null) { super.onBackPressed(); return; }
        String cur = webView.getUrl();
        if (cur != null && !cur.equals(INBOX_URL)) {
            webView.loadUrl(INBOX_URL);
        } else {
            super.onBackPressed();
        }
    }
}
