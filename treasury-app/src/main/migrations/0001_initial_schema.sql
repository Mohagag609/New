-- Migration 0001: Initial Schema
-- This file creates all the necessary tables and indexes for the application.

-- Enable foreign key support which is off by default in SQLite.
PRAGMA foreign_keys = ON;

-- Stores user accounts and their roles.
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'accountant', 'viewer')),
    hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime'))
);

-- Stores projects for associating transactions.
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime'))
);

-- The Chart of Accounts, structured as a tree.
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g., 'asset', 'liability', 'equity', 'revenue', 'expense'
    parent_id INTEGER,
    active BOOLEAN NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime')),
    FOREIGN KEY (parent_id) REFERENCES accounts (id) ON DELETE SET NULL
);

-- Customers and Vendors.
CREATE TABLE IF NOT EXISTS parties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('customer', 'vendor')),
    phone TEXT,
    address TEXT,
    opening_balance REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime'))
);

-- Business partners for settlement.
CREATE TABLE IF NOT EXISTS partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    opening_balance REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime'))
);

-- Main transaction records (receipts, payments).
CREATE TABLE IF NOT EXISTS vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    date TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('receipt', 'payment')),
    account_id INTEGER NOT NULL, -- The cash/bank account
    party_id INTEGER,
    partner_id INTEGER,
    project_id INTEGER,
    amount REAL NOT NULL,
    method TEXT CHECK(method IN ('cash', 'transfer', 'cheque')),
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime')),
    FOREIGN KEY (account_id) REFERENCES accounts (id),
    FOREIGN KEY (party_id) REFERENCES parties (id),
    FOREIGN KEY (partner_id) REFERENCES partners (id),
    FOREIGN KEY (project_id) REFERENCES projects (id),
    FOREIGN KEY (created_by) REFERENCES users (id)
);

-- Double-entry accounting records for each voucher.
CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voucher_id INTEGER, -- Can be null for opening balances etc.
    account_id INTEGER NOT NULL,
    debit REAL NOT NULL DEFAULT 0,
    credit REAL NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime')),
    FOREIGN KEY (voucher_id) REFERENCES vouchers (id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts (id)
);

-- Categories for expenses.
CREATE TABLE IF NOT EXISTS expense_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime'))
);

-- Specific expense items under categories.
CREATE TABLE IF NOT EXISTS expense_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime')),
    FOREIGN KEY (category_id) REFERENCES expense_categories (id)
);

-- Links to attached files for vouchers.
CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voucher_id INTEGER NOT NULL,
    path TEXT NOT NULL,
    filename TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime')),
    FOREIGN KEY (voucher_id) REFERENCES vouchers (id) ON DELETE CASCADE
);

-- Settlement rules for distributing profits to partners.
CREATE TABLE IF NOT EXISTS rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    percent REAL NOT NULL,
    target TEXT NOT NULL CHECK(target IN ('netIncome', 'revenue', 'custom')),
    partner_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime')),
    FOREIGN KEY (partner_id) REFERENCES partners (id)
);

-- Indexes for faster queries, as requested.
CREATE INDEX IF NOT EXISTS idx_vouchers_date_kind ON vouchers(date, kind);
CREATE INDEX IF NOT EXISTS idx_vouchers_associations ON vouchers(account_id, party_id, partner_id);
CREATE INDEX IF NOT EXISTS idx_entries_associations ON entries(voucher_id, account_id);

-- Table to track which migrations have been applied.
CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime'))
);
