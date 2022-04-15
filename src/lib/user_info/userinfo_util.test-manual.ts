import UserInfoUtil from "./userinfo_util.ts";
import Config from "../config.ts";
import {UserInfo} from "./user_info.ts";

const userInfoUtil = new UserInfoUtil()
const config = new Config()
let userInfo = new UserInfo()
userInfo.fullName = await userInfoUtil.askFullName(config)
userInfo.login = await userInfoUtil.askLogin(config)
userInfo.email = await userInfoUtil.askEmail(config)
const password = await userInfoUtil.askPassword(config)
console.log(userInfo)
console.log(password)
