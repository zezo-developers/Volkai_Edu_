declare interface IRegisterUser {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    orgName: string;
    inviteToken?:string;
}

declare interface ILoginUser {
    email: string;
    password: string;
}