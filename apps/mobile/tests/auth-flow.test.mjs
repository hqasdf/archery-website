import assert from "node:assert/strict";
import test from "node:test";
import { authEvent, beginIdentityCheck, beginPasswordSignIn, finishIdentityCheck, initialAuthState, passwordSignInSucceeded } from "../src/auth-state.ts";
import {
  authDestination, cancelRecovery, completeRecovery, isMissingOrInvalidSession, parseRecoveryContext, parseSignupContext, recoveryBlocksApp, safeAuthMessage,
  serializeRecoveryContext, serializeSignupContext,
} from "../src/auth-flow.ts";

const user = { id: "archer-1" };

test("startup distinguishes loading, verified identity, and no session", () => {
  const initial = initialAuthState();
  assert.equal(initial.status, "loading");
  const checking = beginIdentityCheck(initial);
  assert.equal(finishIdentityCheck(checking, checking.generation, user, false).status, "authenticated");
  assert.equal(finishIdentityCheck(checking, checking.generation, null, false).status, "unauthenticated");
});

test("newer sign-in and sign-out events supersede a pending startup result", () => {
  const checking = beginIdentityCheck(initialAuthState());
  const signedIn = authEvent(checking, "SIGNED_IN", user);
  assert.deepEqual(finishIdentityCheck(signedIn, checking.generation, null, false), signedIn);
  const signedOut = authEvent(checking, "SIGNED_OUT", null);
  assert.deepEqual(finishIdentityCheck(signedOut, checking.generation, user, false), signedOut);
  assert.equal(signedOut.status, "unauthenticated");
  assert.deepEqual(authEvent(checking, "INITIAL_SESSION", user), checking);
});

test("a successful password sign-in enters Sessions even if startup verification later finishes", () => {
  const checking = beginIdentityCheck(initialAuthState(), 1);
  const started = beginPasswordSignIn(checking, 2);
  assert.deepEqual(finishIdentityCheck(started, 1, null, false), started);
  // The provider owns this explicit password result instead of relying on a generic SIGNED_IN event.
  const signedIn = passwordSignInSucceeded(started, user, 3);
  assert.equal(signedIn.status, "authenticated");
  assert.equal(recoveryBlocksApp(signedIn.user, null), false);
  assert.equal(authDestination(signedIn.user, null), "sessions");
  assert.deepEqual(finishIdentityCheck(signedIn, 1, null, false), signedIn);
  assert.deepEqual(finishIdentityCheck(signedIn, 1, null, true), signedIn);
});

test("normal password sign-in and sign-out invalidate abandoned recovery routing", () => {
  const abandoned = { active: true, email: "archer@example.com", stage: "password", userId: user.id };
  const signedIn = passwordSignInSucceeded(initialAuthState(), user);
  // Normal sign-in clears persisted and in-memory recovery before publishing this state.
  const recoveryAfterPasswordSignIn = null;
  assert.equal(recoveryBlocksApp(signedIn.user, recoveryAfterPasswordSignIn), false);
  assert.equal(authDestination(signedIn.user, recoveryAfterPasswordSignIn), "sessions");
  const signedOut = authEvent(signedIn, "SIGNED_OUT", null);
  assert.equal(signedOut.status, "unauthenticated");
  assert.equal(recoveryBlocksApp(signedOut.user, abandoned), false);
  assert.equal(authDestination(signedOut.user, abandoned), "sign-in");
  assert.equal(authDestination(signedOut.user, null), "sign-in");
});

test("failed startup verification blocks user content and can be retried", () => {
  const checking = beginIdentityCheck(initialAuthState());
  const failed = finishIdentityCheck(checking, checking.generation, user, true);
  assert.equal(failed.status, "error");
  assert.equal(failed.user, null);
  const retry = beginIdentityCheck(failed);
  assert.equal(finishIdentityCheck(retry, retry.generation, user, false).status, "authenticated");
});

test("no stored session and revoked sessions resolve signed out, not Retry", () => {
  for (const error of [{ name: "AuthSessionMissingError" }, { code: "refresh_token_not_found" }, { code: "session_not_found" }]) {
    assert.equal(isMissingOrInvalidSession(error), true);
    const checking = beginIdentityCheck(initialAuthState());
    assert.equal(finishIdentityCheck(checking, checking.generation, null, !isMissingOrInvalidSession(error)).status, "unauthenticated");
  }
  assert.equal(isMissingOrInvalidSession({ name: "AuthRetryableFetchError" }), false);
});

test("valid later auth event recovers from a startup error", () => {
  const checking = beginIdentityCheck(initialAuthState());
  const failed = finishIdentityCheck(checking, checking.generation, null, true);
  assert.equal(authEvent(failed, "SIGNED_IN", user).status, "authenticated");
});

test("recovery request, OTP, relaunch, and completion use only non-secret persisted context", () => {
  const requested = parseRecoveryContext(serializeRecoveryContext({ active: true, email: "archer@example.com", stage: "verify" }));
  assert.deepEqual(requested, { active: true, email: "archer@example.com", stage: "verify" });
  const verified = parseRecoveryContext(serializeRecoveryContext({ active: true, email: requested.email, stage: "password", userId: user.id }));
  assert.deepEqual(verified, { active: true, email: "archer@example.com", stage: "password", userId: user.id });
  assert.equal(recoveryBlocksApp(user, verified), true);
  assert.equal(authDestination(user, verified), "recover");
  assert.equal(recoveryBlocksApp(null, verified), false);
  assert.equal(authDestination(null, verified), "sign-in");
  assert.equal(recoveryBlocksApp(user, requested), false);
  assert.equal(recoveryBlocksApp({ id: "different-user" }, verified), false);
  assert.equal(authDestination({ id: "different-user" }, verified), "sessions");
  assert.equal(parseRecoveryContext(null), null); // completed or cancelled
  assert.equal(authDestination(user, null), "sessions"); // password updated
  assert.deepEqual(Object.keys(JSON.parse(serializeRecoveryContext(verified))).sort(), ["active", "email", "stage", "userId"]);
});

test("bad or old recovery storage cannot create a password gate", () => {
  assert.equal(parseRecoveryContext("not json"), null);
  assert.equal(parseRecoveryContext(JSON.stringify({ email: "x@example.com", stage: "complete" })), null);
  assert.equal(parseRecoveryContext(JSON.stringify({ email: "bad", stage: "password" })), null);
  assert.equal(parseRecoveryContext(JSON.stringify({ email: "archer@example.com", stage: "password" })), null);
  assert.equal(authDestination(user, parseRecoveryContext(JSON.stringify({ email: "archer@example.com", stage: "password" }))), "sessions");
});

test("password failure keeps pending recovery; success clears it afterward", async () => {
  let pending = true;
  await assert.rejects(completeRecovery(async () => { throw Error("update failed"); }, async () => { pending = false; }));
  assert.equal(pending, true);
  await completeRecovery(async () => {}, async () => { pending = false; });
  assert.equal(pending, false);
});

test("cancel after recovery authentication signs out before clearing context", async () => {
  const calls = [];
  const context = { active: true, email: "archer@example.com", stage: "password" };
  await cancelRecovery(context, true, async () => { calls.push("sign-out"); }, async () => { calls.push("clear"); });
  assert.deepEqual(calls, ["sign-out", "clear"]);
  calls.length = 0;
  await assert.rejects(cancelRecovery(context, true, async () => { throw Error("sign-out failed"); }, async () => { calls.push("clear"); }));
  assert.deepEqual(calls, []);
  assert.equal(authDestination(null, null), "sign-in");
});

test("relaunch routing distinguishes normal sessions, sign-out, active recovery, and stale metadata", () => {
  const realRecovery = parseRecoveryContext(serializeRecoveryContext({ active: true, email: "archer@example.com", stage: "password", userId: user.id }));
  const oldRecovery = parseRecoveryContext(JSON.stringify({ email: "archer@example.com", stage: "password" }));
  assert.equal(authDestination(user, null), "sessions");
  assert.equal(authDestination(null, null), "sign-in");
  assert.equal(authDestination(user, realRecovery), "recover");
  assert.equal(authDestination(user, oldRecovery), "sessions");
  assert.equal(authDestination(null, realRecovery), "sign-in");
});

test("signup can restore verification without storing password or OTP", () => {
  const stored = serializeSignupContext("  archer@example.com  ");
  assert.deepEqual(JSON.parse(stored), { email: "archer@example.com", stage: "verify" });
  assert.deepEqual(parseSignupContext(stored), { email: "archer@example.com", stage: "verify" });
  assert.equal(parseSignupContext(null), null);
  assert.equal(parseSignupContext(JSON.stringify({ email: "archer@example.com", stage: "password" })), null);
});

test("auth errors distinguish credentials, network, rate limits, OTP, and unknown cases", () => {
  assert.equal(safeAuthMessage({ code: "invalid_credentials" }), "Email or password is incorrect.");
  assert.equal(safeAuthMessage({ name: "AuthRetryableFetchError" }), "Unable to connect. Check your internet connection and try again.");
  assert.equal(safeAuthMessage(new TypeError("Network request failed")), "Unable to connect. Check your internet connection and try again.");
  assert.equal(safeAuthMessage({ status: 429 }), "Too many attempts. Please wait and try again.");
  assert.equal(safeAuthMessage({ code: "otp_expired" }, "otp"), "The code is invalid or expired. Request a new code and try again.");
  assert.equal(safeAuthMessage({ code: "unknown", message: "secret server detail" }), "Something went wrong. Please try again.");
});
