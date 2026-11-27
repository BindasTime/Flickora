# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Capacitor discovers plugin methods reflectively. Keep the annotations and
# annotated methods so R8 cannot rename/remove the native bridges.
-keep @interface com.getcapacitor.annotation.CapacitorPlugin
-keep @interface com.getcapacitor.annotation.PluginMethod
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclasseswithmembers class * {
    @com.getcapacitor.annotation.PluginMethod <methods>;
}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile
