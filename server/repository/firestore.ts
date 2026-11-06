import type { Firestore } from "firebase-admin/firestore";
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
