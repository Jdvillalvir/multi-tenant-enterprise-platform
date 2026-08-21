import "server-only";
import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(to: string, link: string) {
  const host=process.env.SMTP_HOST, port=Number(process.env.SMTP_PORT??587), user=process.env.SMTP_USER, pass=process.env.SMTP_PASSWORD, from=process.env.MAIL_FROM;
  if(!host||!user||!pass||!from) throw new Error("SMTP_NOT_CONFIGURED");
  const transporter=nodemailer.createTransport({host,port,secure:port===465,auth:{user,pass}});
  await transporter.sendMail({from,to,subject:"Restablecer contraseña",text:`Use este enlace para restablecer su contraseña. Expira en 30 minutos:\n${link}`,html:`<p>Use este enlace para restablecer su contraseña. Expira en 30 minutos.</p><p><a href="${link}">Restablecer contraseña</a></p>`});
}
