const MONDAY_API = 'https://api.monday.com/v2';

/*
 * A thin monday.com GraphQL client. The integration is enabled only when
 * both env values are present; otherwise every call is a no-op, so the
 * platform runs identically with or without monday configured.
 */
export const mondayEnabled = (): boolean =>
  Boolean(process.env.MONDAY_API_TOKEN && process.env.MONDAY_BOARD_ID);

interface GraphResult<T> {
  data?: T;
  errors?: { message: string }[];
}

const request = async <T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T | null> => {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) {
    return null;
  }
  const response = await fetch(MONDAY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as GraphResult<T>;
  return payload.data ?? null;
};

export const createMondayItem = async (
  itemName: string,
): Promise<string | null> => {
  const boardId = process.env.MONDAY_BOARD_ID;
  if (!boardId) {
    return null;
  }
  const data = await request<{ create_item: { id: string } | null }>(
    'mutation ($board: ID!, $name: String!) { create_item (board_id: $board, item_name: $name) { id } }',
    { board: boardId, name: itemName },
  );
  return data?.create_item?.id ?? null;
};

export const postMondayUpdate = async (
  itemId: string,
  body: string,
): Promise<void> => {
  await request(
    'mutation ($item: ID!, $body: String!) { create_update (item_id: $item, body: $body) { id } }',
    { item: itemId, body },
  );
};
