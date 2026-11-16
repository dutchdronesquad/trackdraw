import { lazy, Suspense } from "react";

// Next's client-only lazy imports, including React 19 ref props, without Next runtime.
export default function dynamic(loader, options = {}) {
  const Component = lazy(loader);
  const Loading = options.loading;
  return function DesktopLazyComponent(props) {
    return (
      <Suspense fallback={Loading ? <Loading /> : null}>
        <Component {...props} />
      </Suspense>
    );
  };
}
