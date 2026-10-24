/* oxlint-disable nextjs/no-img-element -- Local assets are served without a Next.js image server. */
export default function Image({
  src,
  alt,
  fill,
  priority: _priority,
  unoptimized: _unoptimized,
  quality: _quality,
  placeholder: _placeholder,
  blurDataURL: _blur,
  style,
  ...props
}) {
  return (
    <img
      {...props}
      alt={alt}
      src={typeof src === "string" ? src : src.src}
      style={
        fill
          ? {
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              ...style,
            }
          : style
      }
    />
  );
}
