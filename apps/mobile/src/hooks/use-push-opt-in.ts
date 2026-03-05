import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import {
  registerForPushNotifications,
  getPushPermissionStatus,
} from "@/lib/push-notifications";

const OPT_IN_ASKED_KEY = "habita_mobile_push_opt_in_asked";
const ACTION_COUNT_KEY = "habita_mobile_action_count";
const ACTIONS_BEFORE_ASK = 1;

/**
 * Hook that tracks user actions and prompts for push notification permission
 * after the first meaningful action. Call `trackAction()` in onSuccess of
 * mutations like creating an expense or completing a task.
 */
export function usePushOptIn() {
  const [shouldAsk, setShouldAsk] = useState(false);

  const trackAction = useCallback(async () => {
    const alreadyAsked = await AsyncStorage.getItem(OPT_IN_ASKED_KEY);
    if (alreadyAsked) return;

    const status = await getPushPermissionStatus();
    if (status === "granted") {
      await AsyncStorage.setItem(OPT_IN_ASKED_KEY, "true");
      await registerForPushNotifications();
      return;
    }

    const countStr = await AsyncStorage.getItem(ACTION_COUNT_KEY);
    const count = (parseInt(countStr ?? "0", 10) || 0) + 1;
    await AsyncStorage.setItem(ACTION_COUNT_KEY, String(count));

    if (count >= ACTIONS_BEFORE_ASK) {
      setShouldAsk(true);
    }
  }, []);

  useEffect(() => {
    if (!shouldAsk) return;

    const ask = async () => {
      await AsyncStorage.setItem(OPT_IN_ASKED_KEY, "true");
      setShouldAsk(false);

      Alert.alert(
        "Activar notificaciones",
        "Te avisamos cuando alguien te transfiere una tarea, vence un servicio o hay ofertas. Podés desactivarlas cuando quieras.",
        [
          { text: "Ahora no", style: "cancel" },
          {
            text: "Activar",
            onPress: () => {
              void registerForPushNotifications();
            },
          },
        ],
      );
    };

    void ask();
  }, [shouldAsk]);

  return { trackAction };
}
