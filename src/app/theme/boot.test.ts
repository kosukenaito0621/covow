/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import boot from "../../../public/boot.js?raw";
import { THEMES } from "./themes";

// public/boot.js（アプリより先に動く小さなスクリプト）のテーマの色が、本体の設定とずれていないこと
describe("boot.js", () => {
  it.each(Object.values(THEMES).map((t) => [t.id, t.metaColor] as const))("%s の色が同じ", (id, color) => {
    expect(boot).toContain(`${id}: "${color}"`);
  });
});
