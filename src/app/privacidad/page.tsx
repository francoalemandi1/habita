import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description: "Política de privacidad de Habita — Coordinación del Hogar",
};

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <Link
        href="/"
        className="mb-8 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Volver al inicio
      </Link>

      <h1 className="mb-2 text-3xl font-bold tracking-tight">Política de Privacidad</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Última actualización: 10 de marzo de 2025
      </p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-[15px] leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold">1. Información que recopilamos</h2>
          <p>
            Habita recopila la información mínima necesaria para brindarte el servicio:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Datos de cuenta:</strong> nombre, dirección de email y foto de perfil
              proporcionados por Google al iniciar sesión con tu cuenta de Google.
            </li>
            <li>
              <strong>Datos del hogar:</strong> tareas, gastos, listas de compras, preferencias
              alimentarias y demás información que vos y los miembros de tu hogar ingresen
              voluntariamente en la plataforma.
            </li>
            <li>
              <strong>Token de notificaciones:</strong> si habilitás las notificaciones push,
              almacenamos un identificador del dispositivo (Expo Push Token) para poder enviarte
              notificaciones.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Cómo usamos tu información</h2>
          <p>Usamos tus datos exclusivamente para:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Proveer y mejorar las funcionalidades de Habita (tareas, gastos, compras, recetas).</li>
            <li>Enviar notificaciones push relacionadas con la actividad de tu hogar.</li>
            <li>Generar sugerencias personalizadas basadas en las preferencias de tu hogar.</li>
            <li>Mantener la seguridad de tu cuenta y prevenir el uso no autorizado.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Compartición de datos</h2>
          <p>
            <strong>No vendemos, alquilamos ni compartimos tus datos personales con terceros</strong>{" "}
            con fines comerciales o publicitarios.
          </p>
          <p>
            Los datos de tu hogar son visibles únicamente por los miembros que pertenecen a ese
            hogar. Cada hogar está aislado: ningún usuario puede acceder a datos de un hogar al que
            no pertenece.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Almacenamiento y seguridad</h2>
          <p>
            Tus datos se almacenan en servidores seguros con encriptación en tránsito (HTTPS/TLS).
            Las contraseñas no se almacenan ya que la autenticación se delega a Google OAuth 2.0.
          </p>
          <p>
            Implementamos medidas técnicas para proteger tu información, incluyendo aislamiento de
            datos por hogar, tokens de sesión con expiración y rotación automática.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Notificaciones push</h2>
          <p>
            Las notificaciones push son opcionales. Podés habilitarlas o deshabilitarlas en cualquier
            momento desde la configuración de la app. Utilizamos el servicio de Expo Push
            Notifications para el envío, que actúa como intermediario con los servicios nativos de
            Google (FCM) y Apple (APNs).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Tus derechos</h2>
          <p>Podés en cualquier momento:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Acceder a todos tus datos desde la aplicación.</li>
            <li>Modificar tu nombre y preferencias de perfil.</li>
            <li>Desactivar las notificaciones push.</li>
            <li>
              Solicitar la eliminación de tu cuenta y todos tus datos enviando un email a la
              dirección de contacto indicada abajo.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Cambios en esta política</h2>
          <p>
            Podemos actualizar esta política de privacidad ocasionalmente. Publicaremos cualquier
            cambio en esta misma página con la fecha de actualización correspondiente.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Contacto</h2>
          <p>
            Si tenés preguntas sobre esta política de privacidad o querés ejercer tus derechos,
            escribinos a:{" "}
            <a href="mailto:privacidad@habita.casa" className="text-primary hover:underline">
              privacidad@habita.casa
            </a>
          </p>
        </section>
      </div>

      <div className="mt-12 border-t pt-6 text-center text-sm text-muted-foreground">
        <p>Habita — Coordinación integral del hogar</p>
      </div>
    </div>
  );
}
