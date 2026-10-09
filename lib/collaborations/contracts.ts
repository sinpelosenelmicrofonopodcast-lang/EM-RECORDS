export const TERMS_VERSION = '2026-10-09.1';
export const PRIVATE_BUCKET = 'collaboration-private';
export const MAX_DEMO_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
export const MAX_PREVIEW_BYTES = 3 * 1024 * 1024;
export const SUBMISSION_TERMS = `Envío privado: autorizo a EM Records a almacenar y revisar este demo durante la convocatoria. Conservo los derechos del demo. Declaro tener 18 años o más y autorización de todos los titulares para enviarlo. Si autorizo el preview, concedo permiso no exclusivo para crear y publicar un fragmento de hasta 30 segundos en la web y redes del proyecto durante la convocatoria y hasta 90 días después del cierre de votación; después se retira de los canales bajo control de EM, salvo acuerdo adicional. Esto incluye composición, grabación y nombre artístico autorizado, sin autorizar publicar el tema completo. Entiendo que terceros pueden copiar el preview. Enviar no garantiza selección ni transfiere el master o publishing. Los seleccionados deben firmar los acuerdos finales y habilitar su cobro directo. El demo se elimina a los 90 días del cierre si no es seleccionado, salvo disputa o conservación legal justificada. Los datos se usan para revisión, contacto, votación y documentación; no para marketing sin consentimiento separado.`;
export type Campaign = {
 id:string; slug:string; title:string; description:string; project_artist:string; status:string;
 legal_entity:string; eligibility:string; promotion_commitment:string; submissions_start:string|null;
 submissions_end:string|null; voting_start:string|null; voting_end:string|null;
 max_submissions:number; legal_reviewed:boolean; rules_version:number; rules:Record<string,unknown>;
};
export function campaignBlockers(c:Campaign) {
 const errors:string[]=[];
 if(!c.legal_entity.trim()) errors.push('Entidad legal firmante');
 if(!c.eligibility.trim()) errors.push('Territorios y elegibilidad');
 if(!c.promotion_commitment.trim()) errors.push('Entregables de promoción');
 if(!c.legal_reviewed) errors.push('Revisión de bases y contratos');
 const dates=[c.submissions_start,c.submissions_end,c.voting_start,c.voting_end].map(x=>x?new Date(x).getTime():NaN);
 if(dates.some(x=>!Number.isFinite(x)) || !(dates[0]<dates[1] && dates[1]<=dates[2] && dates[2]<dates[3])) errors.push('Fechas válidas: recepción → votación');
 return errors;
}
export function renderAgreement(c:Campaign,s:Record<string,any>) {
 return `ACUERDO DE COLABORACIÓN POR CANCIÓN — ${c.title}\nVersión ${TERMS_VERSION}; revisión ${s.contract_revision}\n\nPARTES: ${c.legal_entity} (EM Records), ${s.legal_name} (${s.artist_name}) y titulares identificados en el anexo.\nCANCIÓN: ${s.track_title}. Proyecto artístico: ${c.project_artist}.\n\n1. APORTES. EM aporta arte, distribución, ${c.promotion_commitment}, mezcla y beat cuando sean necesarios según el expediente. El artista aporta interpretación, voces y materiales autorizados. No se garantizan reproducciones o ingresos.\n2. MASTER. El master final será copropiedad 50% del lado EM y 50% del lado artista conforme al anexo firmado por todos los titulares. EM administra distribución y explotación ordinaria; sincronizaciones, transferencias de propiedad y cambios de porcentajes requieren consentimiento escrito de los titulares. El demo previo conserva su propiedad original.\n3. INGRESOS. 50% lado EM y 50% lado artista del dinero del master acreditado por el distribuidor, sujeto solo a comisiones reales del servicio y retenciones legales. Cada beneficiario recibe su participación directamente. Sin recuperación previa, deuda personal ni cargos por los aportes ofrecidos. Gastos extraordinarios solo por acuerdo escrito. No se incluyen regalías de composición ni pagos directos de intérprete de SoundExchange.\n4. DURACIÓN. El reparto y la copropiedad aplican durante la vigencia legal de los derechos, sujetos a derechos legales irrenunciables. No se extiende a otras canciones o a la carrera del artista.\n5. COMPOSICIÓN. Los porcentajes se fijan en el split sheet por los autores reales. DGM administra solo participaciones expresamente autorizadas; el lado artista conserva su administración. Beats externos respetan derechos y licencias previas. Este acuerdo no atribuye automáticamente autoría al sello.\n6. COBRO Y REGISTROS. EM entrega el master e ISRC al distribuidor. Cada beneficiario acepta su Split y completa datos fiscales. Cada administrador registra su participación usando la ficha acordada, sin reclamaciones duplicadas. Costos de cuentas y retiros: ${String(s.splits?.account_costs||'Pendiente de definir')}.\n7. PRODUCCIÓN. Sesiones, archivos y máximo dos rondas de revisiones según anexo. Fecha de entrega: ${String(s.splits?.delivery_date||'Pendiente')}; fecha límite de lanzamiento: ${String(s.splits?.release_deadline||'Pendiente')}.\n8. DERECHOS. Todos los titulares autorizan los usos acordados; se adjuntan licencias, samples y contratos de productores. Content ID se activa solo si los derechos lo permiten y con gestión de excepciones para canales autorizados.\n9. INCUMPLIMIENTO. Aviso escrito y 30 días para corregir. Si no se lanza en el plazo, el artista puede exigir terminación de la administración exclusiva y acordar entrega del catálogo, sin borrar derechos ya adquiridos salvo resolución aplicable. Una disputa no autoriza cambios unilaterales de porcentajes.\n10. LEY Y DISPUTAS. ${String(s.splits?.governing_law||'Pendiente de definir por las partes')}.\n\nANEXO APROBADO:\n${JSON.stringify(s.splits,null,2)}\n\nEste documento requiere los consentimientos de todos los titulares identificados. La aceptación del artista no sustituye las firmas de otros autores, productores o propietarios.\n`;
}
export function contractBlockers(c:Campaign,s:Record<string,any>) {
 const errors=campaignBlockers(c);
 if(!s.rights_verified) errors.push('Derechos verificados');
 const x=s.splits||{};
 const parties=Array.isArray(x.master)?x.master:[];
 if(!parties.length || parties.some((p:any)=>!p.name || !p.email || !['em','artist'].includes(p.side) || !Number.isFinite(p.percent) || p.percent<=0)) errors.push('Beneficiarios del master completos');
 for(const side of ['em','artist']) if(Math.abs(parties.filter((p:any)=>p.side===side).reduce((a:number,p:any)=>a+p.percent,0)-50)>0.001) errors.push(`La mitad ${side} debe sumar 50%`);
 const writers=Array.isArray(x.composition)?x.composition:[];
 if(!writers.length || writers.some((w:any)=>!w.name || !w.pro || !w.ipi || !w.publisher || !Number.isFinite(w.percent) || w.percent<=0) || Math.abs(writers.reduce((a:number,w:any)=>a+w.percent,0)-100)>0.001) errors.push('Composición: autores, PRO, IPI, publishing y total 100%');
 for(const side of ['em','artist']) if(Math.abs(writers.filter((w:any)=>w.side===side).reduce((a:number,w:any)=>a+w.percent,0)-50)>0.001) errors.push(`Composición: la mitad ${side} debe sumar 50%; requiere autorización de todos los titulares`);
 if(!x.delivery_date || !x.release_deadline || !Number.isFinite(Date.parse(x.delivery_date)) || !Number.isFinite(Date.parse(x.release_deadline)) || Date.parse(x.delivery_date)>=Date.parse(x.release_deadline)) errors.push('Plazos de entrega y lanzamiento');
 if(!x.governing_law || !x.account_costs) errors.push('Ley aplicable y costos de cuentas');
 return [...new Set(errors)];
}
// Only canonical PCM WAV files created by the browser cropper are accepted as previews.
export function validatePreviewWav(b:Buffer) {
 if(b.length<44 || b.toString('ascii',0,4)!=='RIFF' || b.toString('ascii',8,12)!=='WAVE' || b.toString('ascii',12,16)!=='fmt ' || b.readUInt32LE(16)!==16 || b.readUInt16LE(20)!==1 || b.readUInt16LE(22)!==1 || b.readUInt32LE(24)!==22050 || b.readUInt16LE(34)!==16 || b.toString('ascii',36,40)!=='data' || b.readUInt32LE(40)!==b.length-44 || b.readUInt32LE(4)!==b.length-8 || b.readUInt32LE(28)!==44100 || b.readUInt16LE(32)!==2) throw new Error('Preview WAV inválido. Usa el recortador interno.');
 const seconds=(b.length-44)/44100;
 if(seconds<10 || seconds>30.01) throw new Error('El preview debe durar entre 10 y 30 segundos.');
 return seconds;
}
