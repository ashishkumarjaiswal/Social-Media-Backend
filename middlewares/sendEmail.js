const nodeMailer = require("nodemailer");

exports.sendEmail = async (options) => {
  //   const transporter = nodeMailer.createTransport({
  //     host: process.env.SMTP_HOST,
  //     port: process.env.SMTP_PORT,
  //     auth: {
  //       user: process.env.SMTP_MAIL,
  //       pass: process.env.SMTP_PASS,
  //     },

  //     service: process.env.SMTP_SERVICE,
  //   });

  const transporter = nodeMailer.createTransport({
    host: "smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "76182612ea25e4",
      pass: "2575ae0ea03dcf",
    },
  });

  const mailOptions = {
    from: process.env.SMTP_MAIL,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  await transporter.sendMail(mailOptions);
};
