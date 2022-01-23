import express, { Request, Response, Application, NextFunction } from 'express';
import { CustomUserReq } from '../models/custom';

export const redirect = (req: Request, res: Response, next: NextFunction) => {
  // Login with facebook
  res.redirect('/api/v1/users/profile');
  // res.send(req.user);
};

export const protect = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    res.redirect('/api/v1/users/login');
  } else {
    // if logged in
    next();
  }
};

export const logout = (req: Request, res: Response, next: NextFunction) => {
  req.logout();
  res.redirect('/api/v1/users/login');
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.send('User can now log in from this route');
};

export const profile = async (req: CustomUserReq, res: Response) => {
  console.log(req.user);
  res.send('You are logged in, Welcome ... ' + req.user!.fullname);
};
