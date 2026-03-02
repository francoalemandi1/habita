import { ApiError } from "@habita/api-client";

export function getMobileErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "NETWORK_ERROR") {
      return "Sin conexion. Revisa internet e intenta nuevamente.";
    }
    if (error.status === 401) {
      return "Tu sesion expiro. Volve a iniciar sesion.";
    }
    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Ocurrio un error inesperado.";
}
