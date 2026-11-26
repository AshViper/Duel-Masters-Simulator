import { expect, test } from '@playwright/test';

// 初回のみ `npx playwright install chromium` が必要
// カードは同梱していないので、カードなしの状態の画面遷移だけを確認する

test('カードがない時はホームに公式カード検索への案内が出る', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('カードがまだありません')).toBeVisible();
  await page.getByRole('button', { name: '公式カード検索へ' }).click();
  await expect(page.getByTestId('official-keyword')).toBeVisible();
});

test('新しいデッキは0枚から始まる', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'デッキ構築' }).click();
  await expect(page.getByTestId('deck-count')).toHaveText('0 / 40');
});
