package com.asianfit.ui.steps;

import com.asianfit.ui.pages.CartPage;
import com.asianfit.ui.pages.CheckoutSuccessPage;
import com.asianfit.ui.pages.StripeCheckoutPage;
import com.asianfit.ui.utils.DriverFactory;
import com.asianfit.ui.utils.GmailVerificationClient;
import com.asianfit.ui.utils.SignupTestState;
import com.asianfit.ui.utils.TestConfig;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import java.time.Instant;
import org.testng.Assert;

public class PaymentSteps {
  private CartPage cartPage() {
    return new CartPage(DriverFactory.getDriver());
  }

  private StripeCheckoutPage stripeCheckoutPage() {
    return new StripeCheckoutPage(DriverFactory.getDriver());
  }

  private CheckoutSuccessPage checkoutSuccessPage() {
    return new CheckoutSuccessPage(DriverFactory.getDriver());
  }

  private String generatedStripeEmail() {
    return "stripe-ui-" + Instant.now().toEpochMilli() + "@example.com";
  }

  @When("I click checkout")
  public void iClickCheckout() {
    cartPage().clickCheckout();
    cartPage().waitForCheckoutDetails();
  }

  @When("I click {string} button")
  public void iClickButton(String label) {
    cartPage().clickButton(label);
  }

  @When("I enter shipping full name {string}")
  public void iEnterShippingFullName(String fullName) {
    cartPage().enterShippingFullName(fullName);
  }

  @When("I enter shipping phone {string}")
  public void iEnterShippingPhone(String phone) {
    cartPage().enterShippingPhone(phone);
  }

  @When("I enter shipping street {string}")
  public void iEnterShippingStreet(String street) {
    cartPage().enterShippingStreet(street);
  }

  @When("I enter shipping city {string}")
  public void iEnterShippingCity(String city) {
    cartPage().enterShippingCity(city);
  }

  @When("I select shipping state {string}")
  public void iSelectShippingState(String state) {
    cartPage().selectShippingState(state);
  }

  @When("I enter shipping ZIP code {string}")
  public void iEnterShippingZipCode(String zipCode) {
    cartPage().enterShippingZipCode(zipCode);
  }

  @When("I save the shipping address")
  public void iSaveTheShippingAddress() {
    cartPage().saveShippingAddress();
  }

  @When("I start Stripe Checkout payment")
  public void iStartStripeCheckoutPayment() {
    cartPage().startStripeCheckoutPayment();
  }

  @Then("I should be redirected to the Stripe Checkout page")
  public void iShouldBeRedirectedToTheStripeCheckoutPage() {
    Assert.assertTrue(stripeCheckoutPage().isVisible(), "Expected to be on the Stripe Checkout page");
  }

  @When("I choose the Stripe Card payment option")
  public void iChooseTheStripeCardPaymentOption() {
    stripeCheckoutPage().chooseCardPaymentOption();
  }

  @When("I pay with the Stripe test card {string}")
  public void iPayWithTheStripeTestCard(String cardNumber) {
    stripeCheckoutPage().enterCardNumber(cardNumber);
  }

  @When("I enter the Stripe expiration date {string}")
  public void iEnterTheStripeExpirationDate(String expirationDate) {
    stripeCheckoutPage().enterExpirationDate(expirationDate);
  }

  @When("I enter the Stripe security code {string}")
  public void iEnterTheStripeSecurityCode(String securityCode) {
    stripeCheckoutPage().enterSecurityCode(securityCode);
  }

  @When("I enter the Stripe cardholder name {string}")
  public void iEnterTheStripeCardholderName(String cardholderName) {
    stripeCheckoutPage().enterCardholderName(cardholderName);
  }

  @When("I enter a generated Stripe email address")
  public void iEnterAGeneratedStripeEmailAddress() {
    stripeCheckoutPage().enterEmail(generatedStripeEmail());
  }

  @When("I enter the Stripe billing ZIP code {string}")
  public void iEnterTheStripeBillingZipCode(String zipCode) {
    stripeCheckoutPage().enterZipCode(zipCode);
  }

  @When("I enter the Stripe phone number {string}")
  public void iEnterTheStripePhoneNumber(String phoneNumber) {
    stripeCheckoutPage().enterPhoneNumber(phoneNumber);
  }

  @When("I submit the Stripe payment")
  public void iSubmitTheStripePayment() {
    stripeCheckoutPage().submitPayment();
  }

  @When("I cancel Stripe Checkout through Browser's back button")
  public void iCancelStripeCheckout() {
    stripeCheckoutPage().cancelCheckout();
  }

  @When("I cancel Stripe Checkout through Back button on the Stripe Checkout page")
  public void iCancelStripeCheckoutThroughBackButtonOnTheStripeCheckoutPage() {
    stripeCheckoutPage().cancelCheckoutThroughBusinessBackLink();
  }

  @Then("I should be redirected back to the checkout success page")
  public void iShouldBeRedirectedBackToTheCheckoutSuccessPage() {
    checkoutSuccessPage().waitForSuccessPage();
    Assert.assertTrue(checkoutSuccessPage().isVisible(), "Expected checkout success page to be visible");
  }

  @Then("I wait 10 seconds for the Stripe webhook to complete")
  public void iWaitTenSecondsForTheStripeWebhookToComplete() throws InterruptedException {
    Thread.sleep(10_000);
  }

  @Then("I refresh the checkout success page")
  public void iRefreshTheCheckoutSuccessPage() {
    checkoutSuccessPage().refresh();
  }

  @Then("I should be returned to the cart page")
  public void iShouldBeReturnedToTheCartPage() {
    Assert.assertTrue(
      cartPage().isAtCartUrl(),
      "Expected to return to /cart?checkout=1"
    );
  }

  @Then("I should see the invoice download link")
  public void iShouldSeeTheInvoiceDownloadLink() {
    checkoutSuccessPage().waitForConfirmationStateToDisappear();
    checkoutSuccessPage().waitForInvoiceLink();
  }

  @Then("I should receive a payment confirmation email with the invoice attached")
  public void iShouldReceiveAPaymentConfirmationEmailWithTheInvoiceAttached() {
    String email = SignupTestState.signupEmail();
    Assert.assertNotNull(email, "Generated signup email should have been captured before checking invoice email");

    GmailVerificationClient.InvoiceEmail invoiceEmail =
      GmailVerificationClient.findLatestCustomerInvoiceEmail(email);

    Assert.assertTrue(
      invoiceEmail.body().contains("Hi there"),
      "Expected customer invoice email greeting to distinguish it from the store notification"
    );
    Assert.assertTrue(
      invoiceEmail.body().contains("Your invoice"),
      "Expected customer invoice email to contain customer-facing invoice copy"
    );
    SignupTestState.rememberCustomerInvoiceLink(invoiceEmail.invoiceLink());
  }

  @Then("the invoice link should be correct")
  public void theInvoiceLinkShouldBeCorrect() {
    String expectedLink = checkoutSuccessPage().invoiceLinkHref();
    String actualLink = SignupTestState.storeInvoiceLink() != null
      ? SignupTestState.storeInvoiceLink()
      : SignupTestState.customerInvoiceLink();

    Assert.assertNotNull(actualLink, "Invoice link should have been captured from an invoice email first");
    Assert.assertEquals(
      normalizeUrl(actualLink),
      normalizeUrl(expectedLink),
      "Expected invoice email link to match the invoice download link shown after checkout"
    );
  }

  @Then("the store email should also receive a notification email with an invoice link")
  public void theStoreEmailShouldAlsoReceiveANotificationEmailWithAnInvoiceLink() {
    GmailVerificationClient.InvoiceEmail invoiceEmail =
      GmailVerificationClient.findLatestStoreInvoiceEmail(TestConfig.invoiceStoreEmail());

    Assert.assertTrue(
      invoiceEmail.body().contains("Hi OutlierFit team"),
      "Expected store invoice email greeting to distinguish it from the customer email"
    );
    Assert.assertTrue(
      invoiceEmail.body().contains("Customer email:"),
      "Expected store invoice email to contain internal customer/order context"
    );
    SignupTestState.rememberStoreInvoiceLink(invoiceEmail.invoiceLink());
  }

  private String normalizeUrl(String value) {
    return value == null ? null : value.trim().replace("&amp;", "&");
  }

  @Then("Stripe Checkout should show a declined card error")
  public void stripeCheckoutShouldShowADeclinedCardError() {
    Assert.assertTrue(
      stripeCheckoutPage().showsDeclinedCardError(),
      "Expected Stripe Checkout to show a declined card error"
    );
  }

  @Then("I should remain on the Stripe Checkout page")
  public void iShouldRemainOnTheStripeCheckoutPage() {
    Assert.assertTrue(stripeCheckoutPage().isVisible(), "Expected to remain on the Stripe Checkout page");
  }
}
