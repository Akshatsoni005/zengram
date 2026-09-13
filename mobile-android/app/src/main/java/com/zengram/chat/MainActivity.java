package com.zengram.chat;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;
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
 * New Features:
 * - Insta-App-Like Reel Posting (Quick Reel Studio, Camera Recording, Video Picker)
 * - View-Once Disappearing Media Unlocking (Permanent viewing, No timers, Download to Gallery)
 * - Direct Messages & Calls only (Blocks Home Feed, Explore, Endless Reels scroll)
 * - Saved Section enabled for study notes & diagrams
 * - Creator Upload Support (Post & Ghost flow)
 * - WebRTC Audio & Video Calling auto-permission handling
 * - Zero Telemetry: 100% direct connection to official Instagram SSL servers
 */
public class MainActivity extends Activity {

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private static final String INBOX_URL = "https://www.instagram.com/direct/inbox/";
    private static final int PERMISSION_REQUEST_CODE = 101;
    private static final int FILE_CHOOSER_RESULT_CODE = 102;
    private static final int REEL_VIDEO_PICK_CODE = 103;
    private static final int REEL_CAMERA_CAPTURE_CODE = 104;

    private TextView postReelFab;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Auto-request Camera, Audio, and Storage permissions
        checkRequiredPermissions();

        // 1. Root FrameLayout holding WebView and Floating Action Button
        FrameLayout rootLayout = new FrameLayout(this);

        webView = new WebView(this);
        rootLayout.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        // 2. Native Floating Action Button for "🎬 Post Reel"
        postReelFab = new TextView(this);
        postReelFab.setText("🎬 Post Reel");
        postReelFab.setTextColor(Color.WHITE);
        postReelFab.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        postReelFab.setTypeface(Typeface.DEFAULT_BOLD);
        postReelFab.setGravity(Gravity.CENTER);
        postReelFab.setPadding(dpToPx(16), dpToPx(10), dpToPx(16), dpToPx(10));

        // Instagram signature gradient background
        GradientDrawable fabBg = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                new int[]{0xFFF09433, 0xFFE6683C, 0xFFDC2743, 0xFFCC2366, 0xFFBC1888}
        );
        fabBg.setCornerRadius(dpToPx(24));
        postReelFab.setBackground(fabBg);
        postReelFab.setElevation(dpToPx(8));

        FrameLayout.LayoutParams fabParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        fabParams.gravity = Gravity.BOTTOM | Gravity.END;
        fabParams.bottomMargin = dpToPx(24);
        fabParams.rightMargin = dpToPx(18);
        rootLayout.addView(postReelFab, fabParams);

        postReelFab.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showReelCreatorDialog();
            }
        });

        setContentView(rootLayout);

        // 3. Configure WebSettings
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

        // Modern Mobile Chrome User-Agent (Strips 'Version/4.0' to enable camera, reels upload, and view-once streaming)
        settings.setUserAgentString("Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36");

        // Expose Native Bridge for View-Once photo saving and Reel picker
        webView.addJavascriptInterface(new ZenGramNativeBridge(), "ZenGramNative");

        // 4. WebChromeClient handles WebRTC calling permissions & Creator File Uploads
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        // Auto-grant Camera and Microphone for video/voice calling
                        request.grant(request.getResources());
                    }
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

        // 5. WebViewClient enforces Distraction-Free routing & injects ZenGram Engine
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Uri uri = Uri.parse(url);
                String path = uri.getPath();
                if (path == null) path = "";

                // Explicitly allowed: Saved section, DMs, Creator Reel/Post upload, Single post, Stories of contacts
                if (path.contains("/saved") || path.startsWith("/direct") || path.startsWith("/create") || path.startsWith("/p/") || path.startsWith("/stories/")) {
                    // Temporarily hide FAB when in creation studio to leave full editing space
                    if (path.startsWith("/create")) {
                        postReelFab.setVisibility(View.GONE);
                    } else {
                        postReelFab.setVisibility(View.VISIBLE);
                    }
                    return false;
                }

                // If user was creating a post and got redirected to home / profile, return to inbox! (Post & Ghost)
                if (path.equals("/") || path.startsWith("/explore") || path.equals("/reels") || path.equals("/reels/")) {
                    view.loadUrl(INBOX_URL);
                    postReelFab.setVisibility(View.VISIBLE);
                    return true;
                }

                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                injectZenGramSuite(view);
            }
        });

        webView.loadUrl(INBOX_URL);
    }

    private int dpToPx(int dp) {
        return (int) TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                dp,
                getResources().getDisplayMetrics()
        );
    }

    /**
     * Reel Creator Dialog: Insta-app-like creator studio for posting Reels
     */
    private void showReelCreatorDialog() {
        String[] options = {
                "🎬 Choose Reel Video from Gallery",
                "📹 Record New Reel with Camera",
                "🌐 Open Instagram Reel Studio",
                "📷 Post Story / Photo"
        };

        new AlertDialog.Builder(this)
                .setTitle("🎬 ZenGram Reel & Post Studio")
                .setItems(options, new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        if (which == 0) {
                            // 1. Pick video from gallery
                            Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                            intent.setType("video/*");
                            intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"video/mp4", "video/quicktime", "video/x-matroska", "video/webm"});
                            startActivityForResult(Intent.createChooser(intent, "Select Reel Video"), REEL_VIDEO_PICK_CODE);
                        } else if (which == 1) {
                            // 2. Record video with Camera
                            Intent intent = new Intent(MediaStore.ACTION_VIDEO_CAPTURE);
                            startActivityForResult(intent, REEL_CAMERA_CAPTURE_CODE);
                        } else if (which == 2) {
                            // 3. Open Instagram Reel Creator flow directly
                            webView.loadUrl("https://www.instagram.com/create/style/");
                        } else if (which == 3) {
                            // 4. Post Story / Photo
                            webView.loadUrl("https://www.instagram.com/create/story/");
                        }
                    }
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void checkRequiredPermissions() {
        String[] permissions = {
                Manifest.permission.CAMERA,
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.READ_MEDIA_IMAGES,
                Manifest.permission.READ_MEDIA_VIDEO
        };
        boolean needsRequest = false;
        for (String perm : permissions) {
            if (checkSelfPermission(perm) != PackageManager.PERMISSION_GRANTED) {
                needsRequest = true;
                break;
            }
        }
        if (needsRequest) {
            requestPermissions(permissions, PERMISSION_REQUEST_CODE);
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
        } else if (requestCode == REEL_VIDEO_PICK_CODE || requestCode == REEL_CAMERA_CAPTURE_CODE) {
            if (resultCode == Activity.RESULT_OK && data != null && data.getData() != null) {
                Toast.makeText(this, "🎬 Video selected! Loading Instagram Reel Studio to finish...", Toast.LENGTH_SHORT).show();
                webView.loadUrl("https://www.instagram.com/create/style/");
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    /**
     * Injects the ZenGram Core Engine & CSS from assets into Instagram WebView
     */
    private void injectZenGramSuite(WebView view) {
        String css = loadAssetString("zengram-style.css");
        String js = loadAssetString("zengram-engine.js");

        if (css.length() > 0) {
            String cssInjection = "(function() {" +
                    "  var s = document.getElementById('zengram-injected-style');" +
                    "  if (!s) {" +
                    "    s = document.createElement('style');" +
                    "    s.id = 'zengram-injected-style';" +
                    "    s.textContent = " + escapeJsString(css) + ";" +
                    "    document.head.appendChild(s);" +
                    "  }" +
                    "})();";
            view.evaluateJavascript(cssInjection, null);
        }

        if (js.length() > 0) {
            view.evaluateJavascript(js, null);
        } else {
            // Fallback lightweight guard
            String fallback = "(function() {" +
                    "  var s = document.createElement('style');" +
                    "  s.textContent = 'a[href=\"/\"], a[href=\"/explore/\"], a[href=\"/reels/\"], footer, div[role=\"complementary\"] { display: none !important; }';" +
                    "  document.head.appendChild(s);" +
                    "  var path = window.location.pathname;" +
                    "  if (path === '/' || path.startsWith('/explore') || (path.startsWith('/reels') && !path.includes('/reel/'))) {" +
                    "    window.location.replace('" + INBOX_URL + "');" +
                    "  }" +
                    "})();";
            view.evaluateJavascript(fallback, null);
        }
    }

    private String loadAssetString(String filename) {
        try {
            InputStream is = getAssets().open(filename);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int len;
            while ((len = is.read(buf)) != -1) {
                baos.write(buf, 0, len);
            }
            is.close();
            return baos.toString("UTF-8");
        } catch (Exception e) {
            return "";
        }
    }

    private String escapeJsString(String str) {
        StringBuilder sb = new StringBuilder();
        sb.append("\"");
        for (int i = 0; i < str.length(); i++) {
            char c = str.charAt(i);
            if (c == '\"') sb.append("\\\"");
            else if (c == '\\') sb.append("\\\\");
            else if (c == '\n') sb.append("\\n");
            else if (c == '\r') sb.append("\\r");
            else sb.append(c);
        }
        sb.append("\"");
        return sb.toString();
    }

    /**
     * Native Bridge between WebView JavaScript and Android hardware
     */
    public class ZenGramNativeBridge {
        @JavascriptInterface
        public void openReelCreator() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    showReelCreatorDialog();
                }
            });
        }

        @JavascriptInterface
        public void saveMediaToGallery(final String mediaUrl, final String filename) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    downloadAndSaveToGallery(mediaUrl, filename);
                }
            });
        }

        @JavascriptInterface
        public void showToast(final String msg) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    /**
     * Downloads and permanently saves an unlocked view-once photo or video to phone Gallery
     */
    private void downloadAndSaveToGallery(final String mediaUrl, final String filename) {
        Toast.makeText(this, "💾 Saving unlocked photo to Gallery...", Toast.LENGTH_SHORT).show();

        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    File picturesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES);
                    File zengramDir = new File(picturesDir, "ZenGram");
                    if (!zengramDir.exists()) {
                        zengramDir.mkdirs();
                    }
                    String finalName = filename != null && filename.length() > 0 ? filename : ("unlocked_" + System.currentTimeMillis() + ".jpg");
                    final File destFile = new File(zengramDir, finalName);

                    if (mediaUrl.startsWith("data:")) {
                        // Base64 Data URL
                        int commaIdx = mediaUrl.indexOf(",");
                        if (commaIdx != -1) {
                            byte[] decoded = Base64.decode(mediaUrl.substring(commaIdx + 1), Base64.DEFAULT);
                            FileOutputStream fos = new FileOutputStream(destFile);
                            fos.write(decoded);
                            fos.flush();
                            fos.close();
                        }
                    } else {
                        // HTTP/HTTPS CDN URL
                        URL u = new URL(mediaUrl);
                        HttpURLConnection conn = (HttpURLConnection) u.openConnection();
                        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14; Mobile)");
                        conn.connect();
                        InputStream is = conn.getInputStream();
                        FileOutputStream fos = new FileOutputStream(destFile);
                        byte[] buf = new byte[8192];
                        int r;
                        while ((r = is.read(buf)) != -1) {
                            fos.write(buf, 0, r);
                        }
                        fos.flush();
                        fos.close();
                        is.close();
                    }

                    // Scan file so it shows in Google Photos / Gallery immediately
                    MediaScannerConnection.scanFile(
                            MainActivity.this,
                            new String[]{destFile.getAbsolutePath()},
                            null,
                            null
                    );

                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Toast.makeText(MainActivity.this, "✅ View-Once photo saved to Gallery (Pictures/ZenGram)!", Toast.LENGTH_LONG).show();
                        }
                    });
                } catch (final Exception e) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Toast.makeText(MainActivity.this, "Failed to save media: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                        }
                    });
                }
            }
        }).start();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            String curUrl = webView.getUrl();
            if (curUrl != null && (curUrl.contains("/direct/t/") || curUrl.contains("/saved") || curUrl.contains("/create") || curUrl.contains("/p/"))) {
                webView.loadUrl(INBOX_URL);
                if (postReelFab != null) postReelFab.setVisibility(View.VISIBLE);
            } else if (curUrl != null && !curUrl.equals(INBOX_URL)) {
                webView.loadUrl(INBOX_URL);
                if (postReelFab != null) postReelFab.setVisibility(View.VISIBLE);
            } else {
                super.onBackPressed();
            }
        } else {
            super.onBackPressed();
        }
    }
}
