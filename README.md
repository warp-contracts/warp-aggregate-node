# warp-aggregate-node

### How it works

https://www.youtube.com/watch?v=GKPdwjFkoxY

Description coming soon!

### Endpoints

1. `/all-states` - returns a list of all the latest states currently held by the
   aggregate node Example:
   https://contracts.warp.cc/all-states?orderBy=sort_key&order=desc&limit=5
2. `/balances` - returns a list of all balances held by a given `walletAddress`
   Example:
   https://contracts.warp.cc/balances?walletAddress=C6nBlkd7pKRxPiUk1AaGeCrup7XiVQow40NO6c9RDGg
3. `/interactions-by-indexes` - returns a list of interactions associated with
   given indexes.

   To associate interaction with indexes you have to provide a tag with the name
   `Indexed-By`, where values are indexes (up to 5 possible). Example with
   warp-sdk:
   ```javascript
   const interaction = await this.contract.writeInteraction(
     { function: "like", postId }),
     { tags: [{ name: "Indexed-By", value: `project-a;${postId}` }] },
   );
   ```

   Params:
   - `indexes` - list of indexes that interaction is associated with. Indexes
     are divided by `;`. If you pass more than one index, interactions have to
     have ALL passed indexes (AND).
   - `contractTxId`
   - `ownerAddress` - the owner of the interaction

   Example request:

   `https://contracts.warp.cc/interactions-by-indexes?indexes=project-a;0x0120-0x04`

   Response (interactions are ordered by `block_height` in descending order):
   ```json
   {
    "interactions": [
        {
            "block_height": 1108760,
            "contract_tx_id": "ghCNSciu61vISHGV4XfgLoBkLfdm_qewKhVgAEg_pOs",
            "id": "XW5dWJ68ykzedQ-_komt3Pl5eQXWEQrgAyYVMcsGP7c",
            "owner_address": "0x64587b293e4811F4e2588A971D5dB2a11E6D2E4F",
            "tag_index_0": "project-a",
            "tag_index_1": "0x0120-0x04",
            "tag_index_2": null,
            "tag_index_3": null,
            "tag_index_4": null
        }
    ],
    "paging": {
        "items": 1,
        "limit": 1000,
        "page": 1
    }
   ```
