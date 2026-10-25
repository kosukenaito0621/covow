import { model as jaModel } from "@budoux/ja";
import { Parser } from "@budoux/parser";

/*
 * 日本語の改行を、文節の区切りだけにする（「登録できま／す」のような単語の途中での改行を防ぐ）。
 * BudouX（Google）で文節に分け、区切りに「ここで改行してよい」という見えない印（ゼロ幅スペース）を入れる。
 * CSS の :lang(ja) で word-break: keep-all にしているので、印と句読点・空白のところでだけ折り返す。
 * ブラウザ任せの word-break: auto-phrase は iPhone の Safari が対応していないため、この方法にした（2026-10-26 確認）。
 * BudouX の本体（index）は Node 用の部品（linkedom）まで読み込むので、解析器と日本語のモデルだけを直接読み込む（tsconfig の paths）。
 */

const ZWSP = "​";
const JAPANESE = /[぀-ヿ㐀-鿿ｦ-ﾟ]/;
const parser = new Parser(jaModel);
const cache = new Map<string, string>();

/** 日本語を含む文に、文節の区切りの印を入れる（日本語を含まなければそのまま返す） */
export function phrase(text: string): string {
  if (!JAPANESE.test(text)) return text;
  const hit = cache.get(text);
  if (hit !== undefined) return hit;
  const out = parser.parse(text).join(ZWSP);
  if (cache.size > 2000) cache.clear();
  cache.set(text, out);
  return out;
}
