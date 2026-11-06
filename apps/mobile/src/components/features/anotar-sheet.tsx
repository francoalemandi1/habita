import { closeAnotar, useAnotarStore } from "@/lib/anotar-store";
import { AnotarSheetContent } from "./anotar/anotar-sheet-content";

/** §5.3 Global "Anotar" — mounted once in (app)/_layout.tsx, driven by the anotar-store. */
export function AnotarSheet(): React.JSX.Element {
  const { visible, prefill, sessionId } = useAnotarStore();

  return <AnotarSheetContent key={sessionId} visible={visible} prefill={prefill} onClose={closeAnotar} />;
}
