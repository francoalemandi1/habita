import { router } from "expo-router";
import { CreditCard, ListChecks, ShoppingBasket } from "lucide-react-native";
import { APP_ROUTES } from "@habita/contracts";
import { ListRow, Sheet } from "@/components/ds";

import type { Href } from "expo-router";

interface AnotarSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * R3 interim version of the "+" sheet: routes to the existing standalone
 * screens. The real Composer with live parsing lands in R8 (§5.3 Global · Anotar).
 */
export function AnotarSheet({ visible, onClose }: AnotarSheetProps): React.JSX.Element {
  const go = (href: Href) => {
    onClose();
    router.push(href);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Anotar">
      <ListRow icon={CreditCard} title="Gasto" meta="Quién pagó y cómo se divide" onPress={() => go("/(app)/new-expense")} />
      <ListRow icon={ListChecks} title="Tarea" meta="Qué hay que hacer y quién" onPress={() => go("/(app)/new-task")} />
      <ListRow icon={ShoppingBasket} title="Ítem de la lista" meta="Sumalo a la lista del súper" onPress={() => go(APP_ROUTES.super)} />
    </Sheet>
  );
}
