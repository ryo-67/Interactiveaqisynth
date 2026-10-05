import { describe, it, expect } from "vitest";
import { layoutFor, isPhoneLayout } from "./layout";

describe("layoutFor", () => {
  it("laptop at 1024 wide and up when at least 500 tall", () => {
    expect(layoutFor(1024, 768)).toBe("laptop");
    expect(layoutFor(1440, 900)).toBe("laptop");
    expect(layoutFor(1440, 500)).toBe("laptop");
  });
  it("tablet from 768 to 1023 wide", () => {
    expect(layoutFor(768, 1024)).toBe("tablet");
    expect(layoutFor(1023, 700)).toBe("tablet");
  });
  it("phone below 768 wide", () => {
    expect(layoutFor(320, 568)).toBe("phone");
    expect(layoutFor(390, 844)).toBe("phone");
    expect(layoutFor(767, 900)).toBe("phone");
    expect(layoutFor(700, 600)).toBe("phone"); // wider than tall but at least 500 tall
  });
  it("phone-landscape below 500 tall and wider than tall, whatever the width", () => {
    expect(layoutFor(667, 375)).toBe("phone-landscape");
    expect(layoutFor(844, 390)).toBe("phone-landscape");
    expect(layoutFor(932, 430)).toBe("phone-landscape");
    expect(layoutFor(1280, 480)).toBe("phone-landscape"); // a short laptop window
    expect(layoutFor(1280, 499)).toBe("phone-landscape");
  });
  it("a short narrow window that is taller than wide stays phone", () => {
    expect(layoutFor(400, 450)).toBe("phone");
  });
  it("isPhoneLayout", () => {
    expect(isPhoneLayout("phone")).toBe(true);
    expect(isPhoneLayout("phone-landscape")).toBe(true);
    expect(isPhoneLayout("tablet")).toBe(false);
    expect(isPhoneLayout("laptop")).toBe(false);
  });
});
