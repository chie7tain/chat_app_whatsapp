import { Request, Response, NextFunction } from 'express';
import bcrypt, { hash } from 'bcrypt';
import { UserAuth } from '../models/Users';
import { validateSignUp } from '../middlewares/auth';
import PasswordResetToken from '../models/passwordResetSchema';
import Joi, { ref } from 'joi';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import router from '../routes/userRoute';
require('dotenv').config();

export const signup = async function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { error } = validateSignUp(req.body);
  if (error) return res.status(400).json(error.details[0].message);
  const { firstName, lastName, email, phoneNumber, password } = req.body;

  try {
    let user = await UserAuth.findOne({
      $or: [{ email }, { phoneNumber }],
    });
    if (user) return res.status(400).json('User exists');
    const newUser = await UserAuth.create({
      firstName,
      lastName,
      email,
      phoneNumber,
      password: await bcrypt.hash(password, 10),
      if(newUser: any) {
        return res
          .status(200)
          .json('Welcome! You have successfully registered');
      },
    });
  } catch (err: any) {
    return res.status(500).json(err.message);
  }
  res.status(200).json({ msg: 'You have successfully registered!' });
};

//Implementing route-handler for forgotPassword
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    //First step: Get user based on POSTED email
    const schema = Joi.object({ email: Joi.string().email().required() });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json(error.details[0].message);
    const user = UserAuth.findOne(
      { email: req.body.email },
      async (err: any, user: any) => {
        if (!user) {
          return res.status(404).json("User with given email doesn't exist");
        }

        let hashedToken = await PasswordResetToken.findOne({
          userId: user._id,
        });

        if (!hashedToken) {
          hashedToken = await new PasswordResetToken({
            userId: user._id,
            token: crypto.randomBytes(32).toString('hex'),
          }).save();
        }

        const link = `http://${req.headers.host}/api/v1/users/resetPassword/${user._id},${hashedToken.token}`;

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'mavidmuchi@gmail.com',
            pass: 'mavidmuchi1234',
          },
        });

        const mailOptions = {
          from: 'mavidmuchi1234@gmail.com',
          to: user.email,
          subject: 'Reset Password Link',
          text: 'text',
          html: `<h1> Forgot your password? </h1>
              <h1>Please click on the link below to reset your password!! 👧 </h1>
              <h3> The link sent will expire in 10 minutes </h3>
              <h3> If you didn't forget your password, please ignore this email. </h3>
          <p style="color:red; font-size:26px;"><a href="${link}"><i class="fas fa-window-restore"></i>Reset Password </a></p1>`,
        };

        transporter.sendMail(mailOptions, (err: any, info: any) => {
          if (err) throw err;
          console.log('Message sent: %s', info.messageId);
        });
        res.status(200).json({
          status: 'success',
          message:
            'Password Reset Link has been sent! Please check your email...📨',
        });
      }
    );
  } catch (error) {
    res.status(500).json('An error occured');
    console.log('There was an error sending the email. Try again later!');
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const passwordResetSchema = Joi.object({
      password: Joi.string()
        .min(6)
        .required()
        .required()
        .error(new Error('Password most match...')),
      repeatPassword: Joi.ref('password'),
    });

    const { error } = passwordResetSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let userId = req.params.hashedToken.split(',')[0];
    let returnToken = req.params.hashedToken.split(',')[1];

    const user = await UserAuth.findOne({ _id: userId });
    // console.log(user);

    if (!user) {
      return res.status(404).json('invalid link or expired');
    }

    const verifyToken = await PasswordResetToken.findOne({
      token: returnToken,
    });

    if (verifyToken) {
      const hashPassword = await bcrypt.hash(req.body.password, 10);

      UserAuth.findOneAndUpdate(
        { _id: user._id },
        { password: hashPassword },
        (err: any, doc: any) => {
          if (err) return res.json('error occured in password reset');

          res.json({ msg: 'Password reset successfully... ' });
          PasswordResetToken.findOneAndDelete({ userId: user._id });
        }
      );
    }
  } catch (error) {
    console.log('Internal Server Error!');
  }
}

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const schema = Joi.object({ password: Joi.string().min(6).required() });
  const { error } = schema.validate(req.body);
  const { userId } = req.params;
  const { oldPassword, password, confirmPassword } = req.body;

  try {
    // console.log(oldPassword, password);
    const user = await UserAuth.findById(req.params.userId);
    if (!user) {
      return res.status(400).send('User not found');
    }

    const result = await bcrypt.compare(oldPassword, user.password);
    if (!result) {
      throw new Error('Old password doesnt match');
    }

    if (password !== confirmPassword) {
      throw new Error('new password doesnt match confirm password!');
    }

    let salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    user.password = hashedPassword;
    const updatedUser = await user.save();

    return res.json({ user: updatedUser });
  } catch (err: any) {
    console.log(err);
    return res.status(500).send(err.message);
  }
}

export default router;