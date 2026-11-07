import type { Firestore } from "firebase-admin/firestore";
import { gachaResult } from "../../shared/gacha";
import {
  accountState,
  explorationSession,
  newAccount,
  newSession,
  type GameRepository,
  type Mutation,
} from "../model/state";

export class FirestoreGameRepository implements GameRepository {
  constructor(private readonly database: Firestore) {}

  private account(uid: string) {
    return this.database.collection("accounts").doc(uid);
  }

  async read(uid: string) {
    const snapshot = await this.account(uid).get();
    return snapshot.exists ? accountState.parse(snapshot.data()) : newAccount();
  }

  transactDraw(
    uid: string,
    requestId: string,
    mutate: Parameters<GameRepository["transactDraw"]>[2],
  ) {
    const accountRef = this.account(uid);
    const receiptRef = accountRef.collection("gachaDraws").doc(requestId);
    return this.database.runTransaction(async (tx) => {
      const [account, receipt] = await tx.getAll(accountRef, receiptRef);
      const change = mutate(
        account.exists ? accountState.parse(account.data()) : newAccount(),
        receipt.exists ? gachaResult.parse(receipt.data()) : null,
      );
      if (change.account) tx.set(accountRef, change.account);
      if (change.receipt) tx.set(receiptRef, change.receipt);
      return change.value;
    });
  }

  transact<T>(uid: string, sessionId: string | null, mutate: Mutation<T>): Promise<T> {
    const accountRef = this.account(uid);
    const sessionRef = sessionId ? accountRef.collection("exploration").doc(sessionId) : null;
    return this.database.runTransaction(async (tx) => {
      const [account, session] = await Promise.all([
        tx.get(accountRef),
        sessionRef && tx.get(sessionRef),
      ]);
      const change = mutate(
        account.exists ? accountState.parse(account.data()) : newAccount(),
        session?.exists ? explorationSession.parse(session.data()) : newSession(),
      );
      if (change.account) tx.set(accountRef, change.account);
      if (change.session && sessionRef) tx.set(sessionRef, change.session);
      return change.value;
    });
  }
}

export class FirestoreGeminiQuota {
  constructor(
    private readonly database: Firestore,
    private readonly userLimit: number,
    private readonly projectLimit: number,
  ) {}

  reserve(uid: string, day: string): Promise<boolean> {
    const limits = this.database.collection("geminiQuotas");
    const project = limits.doc("project");
    const user = limits.doc("users").collection("byUid").doc(uid);
    return this.database.runTransaction(async (tx) => {
      const [all, individual] = await tx.getAll(project, user);
      const count = (snapshot: typeof all) =>
        snapshot.get("day") === day ? Number(snapshot.get("count")) : 0;
      const total = count(all),
        own = count(individual);
      if (total >= this.projectLimit || own >= this.userLimit) return false;
      tx.set(project, { day, count: total + 1 });
      tx.set(user, { day, count: own + 1 });
      return true;
    });
  }
}
