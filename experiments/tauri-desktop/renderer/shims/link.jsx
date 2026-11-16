import { navigate } from "./navigation.mjs";

export default function Link({
  href,
  prefetch: _prefetch,
  replace,
  scroll: _scroll,
  onClick,
  children,
  ...props
}) {
  const destination = typeof href === "string" ? href : href.pathname;
  return (
    <a
      {...props}
      href={destination}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        navigate(destination, replace);
      }}
    >
      {children}
    </a>
  );
}
