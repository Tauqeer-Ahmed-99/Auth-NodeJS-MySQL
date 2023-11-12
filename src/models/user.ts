import { promisify } from "util";

import getConnection, { MySQLFormattedDate } from "../database/connection";
import NodeError from "../utils/error";
import { IRawUser, IResultSetHeader } from "./../utils/interfaces";
import { APIStatusCode, GenericErrorMessage } from "../utils/enums";

const getUserQuery =
  "SELECT * FROM users WHERE uid = ? OR email = ? OR phone = ?;";

const insertUserQuery =
  "INSERT INTO users (fullname, username, email, password_hash, phone, birth_date, address_line_1, address_line_2, city, state, postal_code, country, country_iso, region, refresh_token, refresh_token_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";

const updateRefreshTokenQuery =
  "UPDATE users SET refresh_token = ?, refresh_token_expires_at = ? WHERE uid = ?;";

const updateUserDetailsQuery =
  "UPDATE users SET fullname = ?, username = ?, phone = ?, birth_date = ?, address_line_1 = ?, address_line_2 = ?, city = ?, state = ?, postal_code = ?, country = ?, country_iso = ?, region = ?, updated_at = ? WHERE uid = ?;";

const updatePaswordQuery =
  "UPDATE users SET password_hash = ?, refresh_token = ?, refresh_token_expires_at = ?, updated_at = ? WHERE uid = ?;";

export default class User {
  uid: number | null = null;
  token: string | null = null;
  refreshToken: string | null = null;
  createdAt: MySQLFormattedDate | null = null;
  updatedAt: MySQLFormattedDate | null = null;
  refreshTokenExpiresAt: MySQLFormattedDate | null = null;

  constructor(
    public fullname: string,
    public username: string,
    public email: string,
    public passwordHash: string,
    public phone?: string | null,
    public dateOfBirth?: MySQLFormattedDate | null,
    public addressLine1?: string | null,
    public addressLine2?: string | null,
    public city?: string | null,
    public state?: string | null,
    public country?: string | null,
    public country_iso?: string | null,
    public region?: string | null,
    public postalCode?: string | null,
  ) {}

  public static findOne = async (uniqueIdentifier: string) => {
    try {
      const connection = await getConnection();

      const queryAsync = promisify(connection.query).bind(connection);

      const result = (await queryAsync({
        sql: getUserQuery,
        values: [uniqueIdentifier, uniqueIdentifier, uniqueIdentifier],
      })) as IRawUser[];

      const rawUser = result[0];

      if (rawUser) {
        const user = new User(
          rawUser.fullname,
          rawUser.username,
          rawUser.email,
          rawUser.password_hash,
          rawUser.phone,
          rawUser.birth_date,
          rawUser.address_line_1,
          rawUser.address_line_2,
          rawUser.city,
          rawUser.state,
          rawUser.country,
          rawUser.country_iso,
          rawUser.region,
          rawUser.postal_code,
        );

        user.uid = rawUser.uid;
        user.createdAt = rawUser.created_at;
        user.updatedAt = rawUser.updated_at;
        user.refreshToken = rawUser.refresh_token;
        user.refreshTokenExpiresAt = rawUser.refresh_token_expires_at;

        connection.release();

        return user;
      }
    } catch (error: any) {
      const err = new NodeError();
      err.message = error.message;
      err.statusCode = APIStatusCode.INTERNAL_SERVER_ERROR;
      err.code = error.code;
      throw err;
    }
  };

  public saveRefreshToken = async () => {
    try {
      const connection = await getConnection();

      const queryAsync = promisify(connection.query).bind(connection);

      const result = (await queryAsync({
        sql: updateRefreshTokenQuery,
        values: [this.refreshToken, this.refreshTokenExpiresAt, this.uid],
      })) as IResultSetHeader;

      if (result.affectedRows < 1) {
        const err = new NodeError(
          GenericErrorMessage.SAVE_FAILED,
          APIStatusCode.INTERNAL_SERVER_ERROR,
        );
        throw err;
      }
    } catch (error) {
      throw error;
    }
  };

  public save = async () => {
    try {
      const connection = await getConnection();

      const queryAsync = promisify(connection.query).bind(connection);
      const result = (await queryAsync({
        sql: insertUserQuery,
        values: [
          this.fullname,
          this.username,
          this.email,
          this.passwordHash,
          this.phone ?? null,
          this.dateOfBirth ?? null,
          this.addressLine1 ?? null,
          this.addressLine2 ?? null,
          this.city ?? null,
          this.state ?? null,
          this.postalCode ?? null,
          this.country ?? null,
          this.country_iso ?? null,
          this.region ?? null,
          this.refreshToken,
          this.refreshTokenExpiresAt,
        ],
      })) as IResultSetHeader;
      if (result.affectedRows === 1) {
        const result = (await queryAsync({
          sql: getUserQuery,
          values: [this.uid, this.email, this.phone],
        })) as IRawUser[];

        const user = result[0];

        this.uid = user.uid;
        this.createdAt = user.created_at;
        this.updatedAt = user.updated_at;
      }

      connection.release();
    } catch (error: any) {
      const err = new NodeError(
        error.message,
        APIStatusCode.INTERNAL_SERVER_ERROR,
        error.code,
      );
      throw err;
    }
  };

  public update = async () => {
    try {
      const connection = await getConnection();

      const queryAsync = promisify(connection.query).bind(connection);

      const result = (await queryAsync({
        sql: updateUserDetailsQuery,
        values: [
          this.fullname,
          this.username,
          this.phone,
          this.dateOfBirth,
          this.addressLine1,
          this.addressLine2,
          this.city,
          this.state,
          this.postalCode,
          this.country,
          this.country_iso,
          this.region,
          this.updatedAt,
          this.uid,
        ],
      })) as IResultSetHeader;

      if (result.affectedRows < 1) {
        const err = new NodeError(
          GenericErrorMessage.SAVE_FAILED,
          APIStatusCode.INTERNAL_SERVER_ERROR,
        );
        throw err;
      }

      connection.release();
    } catch (error: any) {
      const err = new NodeError(
        error.message,
        APIStatusCode.INTERNAL_SERVER_ERROR,
        error.code,
      );
      throw err;
    }
  };

  public updatePassword = async () => {
    try {
      const connection = await getConnection();

      const queryAsync = promisify(connection.query).bind(connection);

      const result = (await queryAsync({
        sql: updatePaswordQuery,
        values: [
          this.passwordHash,
          this.refreshToken,
          this.refreshTokenExpiresAt,
          this.updatedAt,
          this.uid,
        ],
      })) as IResultSetHeader;

      if (result.affectedRows < 1) {
        const err = new NodeError(
          GenericErrorMessage.UPDATE_PASSWORD_FAILED,
          APIStatusCode.INTERNAL_SERVER_ERROR,
        );
        throw err;
      }

      connection.release();
    } catch (error: any) {
      const err = new NodeError(
        error.message,
        APIStatusCode.INTERNAL_SERVER_ERROR,
        error.code,
      );
      throw err;
    }
  };
}
