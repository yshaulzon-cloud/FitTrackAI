# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# --- Capacitor annotations (found with adb logcat on a real phone, Nov 20 2026) ---
# Capacitor reads @CapacitorPlugin / @Permission / @PluginMethod / @ActivityCallback /
# @PermissionCallback by reflection (Class.getAnnotation + calling their members).
# Its own consumer rules keep the annotated plugin classes but NOT the annotation
# types, so with R8 optimization the annotation members were stripped and the app
# crashed on launch: NullPointerException in Plugin.getPermissionStates() <-
# LocalNotificationsPlugin.checkPermissions(). Keep the annotation types whole.
-keep class com.getcapacitor.annotation.** { *; }
-keep class com.getcapacitor.PluginMethod { *; }
-keep class com.getcapacitor.NativePlugin { *; }

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile
