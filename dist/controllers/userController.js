"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.resetPassword = exports.forgotPassword = exports.signup = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const userSchema_1 = __importDefault(require("../models/userSchema"));
const auth_1 = require("../middlewares/auth");
const passwordResetSchema_1 = __importDefault(require("../models/passwordResetSchema"));
const joi_1 = __importDefault(require("joi"));
const crypto_1 = __importDefault(require("crypto"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const userRoute_1 = __importDefault(require("../routes/userRoute"));
require('dotenv').config();
const signup = function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const { error } = (0, auth_1.validateSignUp)(req.body);
        if (error)
            return res.status(400).json(error.details[0].message);
        const { firstName, lastName, email, phoneNumber, password } = req.body;
        try {
            let user = yield userSchema_1.default.findOne({
                $or: [{ email }, { phoneNumber }],
            });
            if (user)
                return res.status(400).json('User exists');
            const newUser = yield userSchema_1.default.create({
                firstName,
                lastName,
                email,
                phoneNumber,
                password: yield bcrypt_1.default.hash(password, 10),
                if(newUser) {
                    return res
                        .status(200)
                        .json('Welcome! You have successfully registered');
                },
            });
        }
        catch (err) {
            return res.status(500).json(err.message);
        }
        res.status(200).json({ msg: 'You have successfully registered!' });
    });
};
exports.signup = signup;
//Implementing route-handler for forgotPassword
function forgotPassword(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //First step: Get user based on POSTED email
            const schema = joi_1.default.object({ email: joi_1.default.string().email().required() });
            const { error } = schema.validate(req.body);
            if (error)
                return res.status(400).json(error.details[0].message);
            const user = userSchema_1.default.findOne({ email: req.body.email }, (err, user) => __awaiter(this, void 0, void 0, function* () {
                if (!user) {
                    return res.status(404).json("User with given email doesn't exist");
                }
                let hashedToken = yield passwordResetSchema_1.default.findOne({
                    userId: user._id,
                });
                if (!hashedToken) {
                    hashedToken = yield new passwordResetSchema_1.default({
                        userId: user._id,
                        token: crypto_1.default.randomBytes(32).toString('hex'),
                    }).save();
                }
                const link = `http://${req.headers.host}/api/v1/users/resetPassword/${user._id},${hashedToken.token}`;
                const transporter = nodemailer_1.default.createTransport({
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
              <h1>Please click on the link below to reset your password!! ???? </h1>
              <h3> The link sent will expire in 10 minutes </h3>
              <h3> If you didn't forget your password, please ignore this email. </h3>
          <p style="color:red; font-size:26px;"><a href="${link}"><i class="fas fa-window-restore"></i>Reset Password </a></p1>`,
                };
                transporter.sendMail(mailOptions, (err, info) => {
                    if (err)
                        throw err;
                    console.log('Message sent: %s', info.messageId);
                });
                res.status(200).json({
                    status: 'success',
                    message: 'Password Reset Link has been sent! Please check your email...????',
                });
            }));
        }
        catch (error) {
            res.status(500).json('An error occured');
            console.log('There was an error sending the email. Try again later!');
        }
    });
}
exports.forgotPassword = forgotPassword;
function resetPassword(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const passwordResetSchema = joi_1.default.object({
                password: joi_1.default.string()
                    .min(6)
                    .required()
                    .required()
                    .error(new Error('Password most match...')),
                repeatPassword: joi_1.default.ref('password'),
            });
            const { error } = passwordResetSchema.validate(req.body);
            if (error)
                return res.status(400).send(error.details[0].message);
            let userId = req.params.hashedToken.split(',')[0];
            let returnToken = req.params.hashedToken.split(',')[1];
            const user = yield userSchema_1.default.findOne({ _id: userId });
            // console.log(user);
            if (!user) {
                return res.status(404).json('invalid link or expired');
            }
            const verifyToken = yield passwordResetSchema_1.default.findOne({
                token: returnToken,
            });
            if (verifyToken) {
                const hashPassword = yield bcrypt_1.default.hash(req.body.password, 10);
                userSchema_1.default.findOneAndUpdate({ _id: user._id }, { password: hashPassword }, (err, doc) => {
                    if (err)
                        return res.json('error occured in password reset');
                    res.json({ msg: 'Password reset successfully... ' });
                    passwordResetSchema_1.default.findOneAndDelete({ userId: user._id });
                });
            }
        }
        catch (error) {
            console.log('Internal Server Error!');
        }
    });
}
exports.resetPassword = resetPassword;
function changePassword(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const schema = joi_1.default.object({ password: joi_1.default.string().min(6).required() });
        const { error } = schema.validate(req.body);
        const { userId } = req.params;
        const { oldPassword, password, confirmPassword } = req.body;
        try {
            // console.log(oldPassword, password);
            const user = yield userSchema_1.default.findById(req.params.userId);
            if (!user) {
                return res.status(400).send('User not found');
            }
            const result = yield bcrypt_1.default.compare(oldPassword, user.password);
            if (!result) {
                throw new Error('Old password doesnt match');
            }
            if (password !== confirmPassword) {
                throw new Error('new password doesnt match confirm password!');
            }
            let salt = yield bcrypt_1.default.genSalt(10);
            const hashedPassword = yield bcrypt_1.default.hash(req.body.password, salt);
            user.password = hashedPassword;
            const updatedUser = yield user.save();
            return res.json({ user: updatedUser });
        }
        catch (err) {
            console.log(err);
            return res.status(500).send(err.message);
        }
    });
}
exports.changePassword = changePassword;
exports.default = userRoute_1.default;
