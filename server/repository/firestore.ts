import type {
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  Transaction,
} from "firebase-admin/firestore";
import { exchangeResult, gachaResult } from "../../shared/gacha";
import { migrateInventory } from "../model/inventory";
import {
  accountState,
  explorationSession,
  newAccount,
  newSession,
  inventoryVersion,
  growthVersion,
  migrateGrowth,
  type GameRepository,
  type Mutation,
} from "../model/state";

export class FirestoreGameRepository implements GameRepository {
  constructor(private readonly database: Firestore) {}

  private account(uid: string) {
    return this.database.collection("accounts").doc(uid);
  }

  private async currentInventory(
    tx: Transaction,
    ref: DocumentReference,
    snapshot: DocumentSnapshot,
  ) {
    const original = snapshot.exists ? accountState.parse(snapshot.data()) : newAccount();
    const account = migrateGrowth(original);
    if (account.inventoryVersion >= inventoryVersion)
      return { account, migrated: account !== original };
    const receipts =
      account.inventoryVersion < 1
        ? await tx.get(ref.collection("gachaDraws").select("itemId"))
        : null;
    const items =
      receipts?.docs
        .map((draw) => draw.get("itemId"))
        .filter((id): id is string => typeof id === "string") ?? [];
    return { account: migrateInventory(account, items), migrated: true };
  }

  async read(uid: string) {
    const ref = this.account(uid);
    const snapshot = await ref.get();
    const account = snapshot.exists ? accountState.parse(snapshot.data()) : newAccount();
    if (account.inventoryVersion >= inventoryVersion && account.growthVersion >= growthVersion)
      return account;
    return this.database.runTransaction(async (tx) => {
      const current = await this.currentInventory(tx, ref, await tx.get(ref));
      if (current.migrated) tx.set(ref, current.account);
      return current.account;
    });
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
      const current = await this.currentInventory(tx, accountRef, account);
      const change = mutate(
        current.account,
        receipt.exists ? gachaResult.parse(receipt.data()) : null,
      );
      if (change.account || current.migrated) tx.set(accountRef, change.account ?? current.account);
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
      const current = await this.currentInventory(tx, accountRef, account);
      const change = mutate(
        current.account,
        session?.exists ? explorationSession.parse(session.data()) : newSession(),
      );
      if (change.account || current.migrated) tx.set(accountRef, change.account ?? current.account);
      if (change.session && sessionRef) tx.set(sessionRef, change.session);
      return change.value;
    });
  }

  transactExchange(
    uid: string,
    requestId: string,
    mutate: Parameters<GameRepository["transactExchange"]>[2],
  ) {
    const accountRef = this.account(uid);
    const receiptRef = accountRef.collection("shardExchanges").doc(requestId);
    return this.database.runTransaction(async (tx) => {
      const [account, receipt] = await tx.getAll(accountRef, receiptRef);
      const current = await this.currentInventory(tx, accountRef, account);
      const change = mutate(
        current.account,
        receipt.exists ? exchangeResult.parse(receipt.data()) : null,
      );
      if (change.account || current.migrated) tx.set(accountRef, change.account ?? current.account);
      if (change.receipt) tx.set(receiptRef, change.receipt);
      return change.value;
    });
  }
}

export class FirestoreGeminiQuota {
  constructor(
    private readonly database: Firestore,
    private readonly userLimit: number,
    private readonly projectLimit: number,
    private readonly enabled = true,
  ) {}

  reserve(uid: string, day: string): Promise<boolean> {
    if (!this.enabled) return Promise.resolve(true);
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
