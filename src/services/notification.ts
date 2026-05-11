import * as MailComposer from 'expo-mail-composer';

export const notifyBotMinuta = async (asunto: string, filasCount: number, originalFileName: string) => {
  if (!(await MailComposer.isAvailableAsync())) return;
  await MailComposer.composeAsync({
    recipients: ["dionicio.flores@slepvallediguillin.gob.cl"],
    subject: `Radar: Minuta Procesada (${asunto})`,
    body: `Se ha generado una nueva minuta desde: ${originalFileName}\nCompromisos: ${filasCount}`,
  });
};
