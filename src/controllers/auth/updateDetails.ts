import express from "express";
import NodeError from "../../utils/error";
import {
  APIStatusCode,
  ErrorCode,
  GenericErrorMessage,
  GenericMessage,
  ResponseStatus,
} from "../../utils/enums";
import User from "../../models/user";
import { getMySQLDateTime } from "../../database/connection";
import { getCountryDetails } from "../../utils/country";
import { JwtPayload } from "jsonwebtoken";

// Extend the Request interface with a custom 'user' property
declare module "express" {
  interface Request {
    user?: JwtPayload & {
      username: string;
      email: string;
    };
  }
}

const updateDetails = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const {
      uid,
      fullname,
      username,
      phone,
      birthDate,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
    } = req.body;

    if (!uid) {
      const err = new NodeError();
      err.message = GenericErrorMessage.ATTATCH_UID;
      err.statusCode = APIStatusCode.BAD_REQUEST;
      err.code = ErrorCode.INVALID_DATA;
      throw err;
    }

    if (username) {
      const userWithSameUsername = await User.findOne(username);
      if (userWithSameUsername && userWithSameUsername.uid !== uid) {
        const err = new NodeError();
        err.message = GenericErrorMessage.DUPLICATE_USERNAME;
        err.statusCode = APIStatusCode.BAD_REQUEST;
        err.code = ErrorCode.DUPLICATE_USERNAME;
        throw err;
      }
    }

    if (phone) {
      const userWithSamePhone = await User.findOne(phone);
      if (userWithSamePhone && userWithSamePhone.uid !== uid) {
        const err = new NodeError();
        err.message = GenericErrorMessage.DUPLICATE_PHONE;
        err.statusCode = APIStatusCode.BAD_REQUEST;
        err.code = ErrorCode.DUPLICATE_PHONE;
        throw err;
      }
    }

    const user = await User.findOne(uid);

    if (!user) {
      const err = new NodeError();
      err.message = GenericErrorMessage.USER_NOT_FOUND;
      err.statusCode = APIStatusCode.BAD_REQUEST;
      err.code = ErrorCode.INVALID_REQUEST;
      throw err;
    }

    if (user.email !== req.user?.email) {
      const err = new NodeError();
      err.message = GenericErrorMessage.JWT_NOT_AUTORIZED;
      err.statusCode = APIStatusCode.UNAUTHORIZED;
      err.code = ErrorCode.INVALID_REQUEST;
      throw err;
    }

    const [country_iso, region] = getCountryDetails(country);

    user.fullname = fullname ?? user.fullname;
    user.username = username ?? user.username;
    user.phone = phone;
    user.dateOfBirth = birthDate
      ? getMySQLDateTime(new Date(birthDate))
      : user.dateOfBirth;
    user.addressLine1 = addressLine1 ?? user.addressLine1;
    user.addressLine2 = addressLine2 ?? user.addressLine2;
    user.city = city ?? user.city;
    user.state = state ?? user.state;
    user.postalCode = postalCode ?? user.postalCode;
    user.region = region ?? user.region;
    user.country = country ?? user.country;
    user.country_iso = country_iso ?? user.country_iso;
    user.updatedAt = getMySQLDateTime(new Date());

    await user.update();

    res.status(APIStatusCode.OK).json({
      status: ResponseStatus.SUCCESS,
      message: GenericMessage.USER_DETAILS_UPDATED,
    });
  } catch (error: any) {
    next(error);
  }
};

export default updateDetails;
