import { LegalLayout, H2 } from './LegalLayout';
import { EMPRESA, TERMINOS_VERSION } from './version';

export function TerminosPage() {
  return (
    <LegalLayout titulo="Términos y Condiciones">
      <p className="text-xs text-slate-400">
        Versión {TERMINOS_VERSION} · {EMPRESA.ciudad}
      </p>

      <p>
        Estos Términos y Condiciones regulan el uso de la aplicación de gestión de{' '}
        <b>{EMPRESA.nombre}</b> (en adelante, «la Academia»). Al crear una cuenta y usar la
        aplicación, el usuario declara haberlos leído y aceptado.
      </p>

      <H2>1. Objeto</H2>
      <p>
        La aplicación permite a los alumnos inscribirse en planes de la academia o en clases
        personalizadas, elegir sus días de entrenamiento, registrar pagos, reservar clases y
        consultar su estado de cuenta. La Academia usa la aplicación para gestionar inscripciones,
        asistencia, pagos y comunicación con los alumnos.
      </p>

      <H2>2. Registro y cuenta</H2>
      <p>
        El usuario es responsable de la veracidad de los datos que proporciona y de mantener la
        confidencialidad de su contraseña. Cualquier actividad realizada desde su cuenta es de su
        responsabilidad. Debe notificar de inmediato a la Academia cualquier uso no autorizado.
      </p>

      <H2>3. Menores de edad</H2>
      <p>
        Si el alumno es menor de edad, la cuenta debe ser creada y gestionada por su padre, madre o
        apoderado, quien acepta estos Términos en su representación y autoriza el tratamiento de los
        datos del menor conforme a la Política de Privacidad.
      </p>

      <H2>4. Pagos y comprobantes</H2>
      <p>
        Los pagos (mensualidades, paquetes o clases) se registran subiendo el comprobante de la
        transferencia, Yape, Plin o efectivo. El plan o los créditos se activan cuando la
        administración valida el pago. Los precios vigentes son los publicados por la Academia y
        pueden actualizarse. La aplicación <b>no</b> procesa cobros con tarjeta ni almacena datos de
        tarjetas.
      </p>

      <H2>5. Reservas, asistencia y créditos</H2>
      <p>
        Las reservas de clases personalizadas quedan sujetas a confirmación del entrenador y a la
        disponibilidad publicada. La asistencia y el consumo de créditos se registran según la
        participación real del alumno. Las políticas de cancelación, reprogramación y congelamiento
        de membresías son las que comunique la Academia.
      </p>

      <H2>6. Uso adecuado</H2>
      <p>
        El usuario se compromete a no intentar acceder a datos de otros usuarios, vulnerar la
        seguridad de la aplicación, automatizar registros, ni usar la plataforma para fines
        distintos a los previstos. La Academia puede suspender o eliminar cuentas que incumplan
        estos Términos o realicen un uso indebido.
      </p>

      <H2>7. Disponibilidad del servicio</H2>
      <p>
        La Academia procura mantener la aplicación disponible, pero no garantiza que esté libre de
        interrupciones o errores. Puede modificar, suspender o descontinuar funciones en cualquier
        momento.
      </p>

      <H2>8. Limitación de responsabilidad</H2>
      <p>
        La Academia no será responsable por daños derivados del mal uso de la aplicación, de la
        información proporcionada por el usuario, ni de fallos ajenos a su control (proveedores de
        internet, servicios de terceros, etc.). Las clases y actividades deportivas conllevan
        riesgos propios de la actividad física, que el alumno o su apoderado asumen.
      </p>

      <H2>9. Modificaciones</H2>
      <p>
        La Academia puede actualizar estos Términos. Los cambios relevantes se comunicarán dentro de
        la aplicación y, cuando corresponda, se solicitará una nueva aceptación.
      </p>

      <H2>10. Ley aplicable</H2>
      <p>
        Estos Términos se rigen por las leyes de la República del Perú. Cualquier controversia se
        someterá a los jueces y tribunales de {EMPRESA.ciudad}.
      </p>

      <H2>11. Contacto</H2>
      <p>
        Consultas sobre estos Términos: {EMPRESA.contactoEmail} · WhatsApp{' '}
        {EMPRESA.contactoWhatsApp}.
      </p>

      <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
        Este documento es una plantilla base y no constituye asesoría legal. Recomendamos que un
        abogado lo revise y lo adapte a la realidad de la Academia antes de su uso definitivo.
      </p>
    </LegalLayout>
  );
}
