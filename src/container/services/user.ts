import { UserModel, User } from "../models/user";
import { JsonPlaceholderIntegration } from "../integrations/http/json-placeholder";
import { UserSources } from "../../enums";
import { ServiceContext } from "..";
import { ResourceNotFoundError } from "../../errors";

export class UserService {
  protected readonly userModel: UserModel;
  protected readonly jsonPlaceholderIntegration: JsonPlaceholderIntegration;

  constructor(context: ServiceContext) {
    this.userModel = context.userModel;
    this.jsonPlaceholderIntegration = context.jsonPlaceholderIntegration;
  }

  all(): Promise<User[]> {
    return this.userModel.all();
  }

  async findById(id: string): Promise<User> {
    const user = await this.userModel.getById(id);
    if (!user) {
      throw new ResourceNotFoundError();
    }
    return user;
  }

  async fetchFromJsonPlaceholder(): Promise<string[]> {
    const jsonPlaceholderUsers = await this.jsonPlaceholderIntegration.getUsers();

    const jsonPlaceholderEmails = jsonPlaceholderUsers.map(
      jsonPlaceholderUser => jsonPlaceholderUser.email
    );

    const fetchedIds: string[] = [];

    await this.userModel.transaction(async trx => {
      const sourceDatabaseUsers = await this.userModel.getByEmailsWithSource(
        jsonPlaceholderEmails,
        UserSources.JsonPlaceholder,
        trx
      );

      await Promise.all(
        jsonPlaceholderUsers.map(async jsonPlaceholderUser => {
          const jsonPlaceholderEmail = jsonPlaceholderUser.email.toLowerCase();

          const sourceDatabaseUser = sourceDatabaseUsers.find(
            sourceDatabaseUser =>
              sourceDatabaseUser.emailAddress === jsonPlaceholderEmail
          );

          if (!sourceDatabaseUser) {
            const createData = {
              name: jsonPlaceholderUser.name,
              username: jsonPlaceholderUser.username,
              emailAddress: jsonPlaceholderEmail,
              source: UserSources.JsonPlaceholder
            };
            fetchedIds.push(await this.userModel.create(createData, trx));
          }
        })
      );
    });

    return fetchedIds;
  }
}
