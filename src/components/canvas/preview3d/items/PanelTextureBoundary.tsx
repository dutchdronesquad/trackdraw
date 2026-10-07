import { Component, type ReactNode } from "react";
/** Keep geometry and editing available if a texture cannot load or decode. */
export class PanelTextureBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
