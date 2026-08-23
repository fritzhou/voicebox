// error-logger.js
// Silently logs JavaScript errors to Supabase's error_logs table.
// Include this AFTER supabase-client.js on every page:
//   <script src="supabase-client.js"></script>
//   <script src="error-logger.js"></script>
//
// Students never see anything from this file - it fails silently by design.
// Admins view logged errors from the staff portal's Error Logs page.

async function logErrorToSupabase(message, stackTrace, source) {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    await supabaseClient.from("error_logs").insert({
      source: source || "website",
      message: String(message).slice(0, 2000),
      stack_trace: stackTrace ? String(stackTrace).slice(0, 4000) : null,
      page_or_screen: window.location.pathname,
      user_id: session ? session.user.id : null,
      user_agent: navigator.userAgent
    });
  } catch (loggingError) {
    // Never let logging itself throw or surface to the user.
    console.error("Failed to log error to Supabase:", loggingError);
  }
}

// Catches uncaught errors (syntax errors, thrown exceptions that reach the top, etc.)
window.addEventListener("error", (event) => {
  logErrorToSupabase(
    event.message,
    event.error ? event.error.stack : null,
    "website"
  );
});

// Catches unhandled promise rejections - e.g. an async Supabase call that
// throws but was never wrapped in try/catch.
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  logErrorToSupabase(
    reason && reason.message ? reason.message : String(reason),
    reason && reason.stack ? reason.stack : null,
    "website"
  );
});

// Call this manually from inside an existing try/catch block to log a
// handled error too (one you're already showing a toast for, for example):
//   catch (err) {
//     logErrorToSupabase(err.message, err.stack, "website");
//     showToast("Something went wrong.");
//   }
