package com.asianfit.ui.utils;

/**
 * Stores data created during one signup scenario.
 *
 * Cucumber scenarios can run in parallel, so regular static fields would let one scenario
 * overwrite another scenario's generated email or verification link. ThreadLocal keeps each
 * scenario thread's values separate until the after hook calls clear().
 */
public final class SignupTestState {
  // The generated signup email, usually a Gmail plus-address used for this scenario.
  private static final ThreadLocal<String> SIGNUP_EMAIL = new ThreadLocal<>();

  // The password used when the scenario creates the signup account.
  private static final ThreadLocal<String> SIGNUP_PASSWORD = new ThreadLocal<>();

  // The email verification URL pulled from Gmail.
  private static final ThreadLocal<String> VERIFICATION_LINK = new ThreadLocal<>();

  // The sender address from the verification email, used to verify Resend sent it.
  private static final ThreadLocal<String> VERIFICATION_EMAIL_SENDER = new ThreadLocal<>();

  // The reset-password URL pulled from Gmail.
  private static final ThreadLocal<String> PASSWORD_RESET_LINK = new ThreadLocal<>();

  // The new password entered during a password-reset scenario.
  private static final ThreadLocal<String> RESET_PASSWORD = new ThreadLocal<>();

  // The invoice URL found in the customer-facing payment email.
  private static final ThreadLocal<String> CUSTOMER_INVOICE_LINK = new ThreadLocal<>();

  // The invoice URL found in the store-facing payment notification email.
  private static final ThreadLocal<String> STORE_INVOICE_LINK = new ThreadLocal<>();

  private SignupTestState() {}

  public static void rememberSignupEmail(String email) {
    if (email != null && !email.isBlank()) {
      // Normalize email so cleanup queries match the database consistently.
      SIGNUP_EMAIL.set(email.trim().toLowerCase());
    }
  }

  public static void rememberSignupPassword(String password) {
    if (password != null && !password.isBlank()) {
      SIGNUP_PASSWORD.set(password);
    }
  }

  public static void rememberVerificationEmail(String link, String sender) {
    VERIFICATION_LINK.set(link);
    VERIFICATION_EMAIL_SENDER.set(sender);
  }

  public static void rememberPasswordResetLink(String link) {
    PASSWORD_RESET_LINK.set(link);
  }

  public static void rememberResetPassword(String password) {
    RESET_PASSWORD.set(password);
  }

  public static void rememberCustomerInvoiceLink(String link) {
    CUSTOMER_INVOICE_LINK.set(link);
  }

  public static void rememberStoreInvoiceLink(String link) {
    STORE_INVOICE_LINK.set(link);
  }

  public static String signupEmail() {
    return SIGNUP_EMAIL.get();
  }

  public static String signupPassword() {
    return SIGNUP_PASSWORD.get();
  }

  public static String verificationLink() {
    return VERIFICATION_LINK.get();
  }

  public static String verificationEmailSender() {
    return VERIFICATION_EMAIL_SENDER.get();
  }

  public static String passwordResetLink() {
    return PASSWORD_RESET_LINK.get();
  }

  public static String resetPassword() {
    return RESET_PASSWORD.get();
  }

  public static String customerInvoiceLink() {
    return CUSTOMER_INVOICE_LINK.get();
  }

  public static String storeInvoiceLink() {
    return STORE_INVOICE_LINK.get();
  }

  public static void clear() {
    // Remove all ThreadLocal values so the next scenario on the same worker thread starts clean.
    SIGNUP_EMAIL.remove();
    SIGNUP_PASSWORD.remove();
    VERIFICATION_LINK.remove();
    VERIFICATION_EMAIL_SENDER.remove();
    PASSWORD_RESET_LINK.remove();
    RESET_PASSWORD.remove();
    CUSTOMER_INVOICE_LINK.remove();
    STORE_INVOICE_LINK.remove();
  }
}
