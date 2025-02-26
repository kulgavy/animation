import {UserType} from "../../user/constant";

export type UserPayload = {
    id: string;
    name: string;
    email: string;
    type: UserType;
};