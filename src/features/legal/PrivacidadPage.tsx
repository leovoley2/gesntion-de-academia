import { LegalLayout, H2 } from './LegalLayout';
import { EMPRESA, TERMINOS_VERSION } from './version';

export function PrivacidadPage() {
  return (
    <LegalLayout titulo="Política de Privacidad">
      <p className="text-xs text-slate-400">
        Versión {TERMINOS_VERSION} · {EMPRESA.ciudad}
      </p>

      <p>
        <b>{EMPRESA.nombre}</b> respeta tu privacidad y trata tus datos personales conforme a la{' '}
        <b>Ley N.° 29733, Ley de Protección de Datos Personales del Perú</b>, y su reglamento. Esta
        política explica qué datos recogemos, para qué y qué derechos tienes.
      </p>

      <H2>1. Responsable del tratamiento</H2>
      <p>
        {EMPRESA.nombre} ({EMPRESA.ciudad}). Contacto: {EMPRESA.contactoEmail} · WhatsApp{' '}
        {EMPRESA.contactoWhatsApp}.
      </p>

      <H2>2. Datos que recogemos</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Identificación y contacto: nombre completo, teléfono/WhatsApp y correo electrónico.</li>
        <li>Datos de la cuenta: rol (alumno, entrenador, administrador) y fecha de registro.</li>
        <li>
          Datos de actividad: plan o membresía, días de entrenamiento, reservas, asistencia y
          créditos.
        </li>
        <li>
          Datos de pago: monto, concepto, método (Yape, Plin, transferencia, efectivo) y el
          comprobante que subas. <b>No</b> almacenamos números ni datos de tarjetas de crédito.
        </li>
      </ul>

      <H2>3. Finalidad</H2>
      <p>
        Usamos tus datos para: gestionar tu inscripción y membresía; validar pagos; organizar
        clases, horarios y asistencia; comunicarnos contigo (por ejemplo, recordatorios de pago por
        WhatsApp); y cumplir obligaciones legales y contables. No usamos tus datos para fines
        distintos sin tu consentimiento.
      </p>

      <H2>4. Base legal y consentimiento</H2>
      <p>
        El tratamiento se basa en tu consentimiento (otorgado al registrarte) y en la ejecución de
        la relación entre tú y la Academia. Guardamos un registro de la aceptación de estos términos
        (versión y fecha) como constancia.
      </p>

      <H2>5. Menores de edad</H2>
      <p>
        Cuando el alumno es menor de edad, el tratamiento de sus datos requiere el consentimiento de
        su padre, madre o apoderado, quien es responsable de la cuenta.
      </p>

      <H2>6. Con quién compartimos datos</H2>
      <p>
        No vendemos ni cedemos tus datos. Se alojan en <b>Supabase</b> (infraestructura en la nube)
        como encargado de tratamiento, con medidas de seguridad. Solo el personal autorizado de la
        Academia accede a los datos necesarios para su función. Podremos divulgar información si la
        ley o una autoridad competente lo exige.
      </p>

      <H2>7. Conservación</H2>
      <p>
        Conservamos tus datos mientras exista la relación con la Academia y, luego, el tiempo
        necesario para cumplir obligaciones legales (por ejemplo, contables o tributarias). Después
        se eliminan o anonimizan.
      </p>

      <H2>8. Seguridad</H2>
      <p>
        Aplicamos controles de acceso por rol, cifrado en tránsito, contraseñas protegidas y reglas
        de seguridad a nivel de base de datos para que cada usuario solo acceda a lo que le
        corresponde. Los comprobantes de pago se guardan en un almacenamiento privado con acceso
        restringido.
      </p>

      <H2>9. Tus derechos (ARCO)</H2>
      <p>
        Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición, así como
        revocar tu consentimiento, escribiéndonos a {EMPRESA.contactoEmail}. También puedes acudir a
        la Autoridad Nacional de Protección de Datos Personales (Ministerio de Justicia y Derechos
        Humanos del Perú) si consideras que tus derechos no fueron atendidos.
      </p>

      <H2>10. Cambios</H2>
      <p>
        Podemos actualizar esta política. Publicaremos la nueva versión en la aplicación y, cuando
        el cambio sea relevante, te pediremos aceptarla nuevamente.
      </p>

      <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
        Este documento es una plantilla base y no constituye asesoría legal. Recomendamos que un
        abogado especializado en protección de datos lo revise antes de su uso definitivo, y evaluar
        la inscripción del banco de datos personales ante la autoridad competente si corresponde.
      </p>
    </LegalLayout>
  );
}
