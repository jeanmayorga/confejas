import { describe, expect, test } from "bun:test";

import {
  canViewParticipantDirectory,
  usesCounselorApp,
} from "./roles";

describe("counselor app routing", () => {
  test("sends counselor-only accounts to the counselor app", () => {
    expect(usesCounselorApp("counselor")).toBe(true);
    expect(usesCounselorApp(["participant", "counselor"])).toBe(true);
  });

  test("keeps staff accounts in the dashboard", () => {
    expect(usesCounselorApp("admin")).toBe(false);
    expect(usesCounselorApp("staff,counselor")).toBe(false);
  });

  test("reserves the global participant directory for staff", () => {
    expect(canViewParticipantDirectory("counselor")).toBe(false);
    expect(canViewParticipantDirectory("staff")).toBe(true);
    expect(canViewParticipantDirectory("admin")).toBe(true);
  });
});
