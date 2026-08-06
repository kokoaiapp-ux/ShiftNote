"use client";
import { Purchases, type CustomerInfo } from "@revenuecat/purchases-js";
let instance:Purchases|null=null;
export async function revenueCatForUser(userId:string){const key=process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY;if(!key)return null;if(!instance)instance=Purchases.configure({apiKey:key,appUserId:userId});else if(instance.getAppUserId()!==userId)await instance.changeUser(userId);return instance}
export function hasProEntitlement(info:CustomerInfo|null){const id=process.env.NEXT_PUBLIC_REVENUECAT_ENTITLEMENT_ID||"pro";return Boolean(info?.entitlements.active[id]?.isActive)}