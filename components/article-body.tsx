import { corrupt } from "@/lib/crystr";
import { pictureFor } from "@/lib/article-icons";

/** An article's body. A picture, if it has one, comes first: half the width, on the left, with
 *  the words starting level with its top and wrapping round it. `paras` are already split. */
export function ArticleBody({ icon, paras, decay }: { icon: string | null | undefined; paras: string[]; decay: number }) {
  const pic = pictureFor(icon);
  return (
    <div style={{ display: "flow-root" }}>
      {pic ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pic.src}
          alt=""
          style={{ float: "left", width: "50%", height: "auto", margin: "2px 14px 8px 0", imageRendering: "pixelated" }}
        />
      ) : null}
      {paras.map((p, i) => (
        <div key={i} style={{ fontSize: 14, lineHeight: 1.65, color: "var(--text-2)", textWrap: "pretty", marginBottom: 12 }}>
          {corrupt(p, decay)}
        </div>
      ))}
    </div>
  );
}
