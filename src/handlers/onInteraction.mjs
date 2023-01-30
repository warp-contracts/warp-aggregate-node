export async function onNewInteraction(message, dbUpdates) {
    const payload = JSON.parse(message);

    if (payload.initialState) {

    } else if (payload.interaction) {
        const { tags, owner, id, block } = payload.interaction;

        const indexesString = tags.find(tag => tag.name === "Indexed-By");

        if (indexesString) {
            const indexes = indexesString.value.split(';');

            if (indexes.length > 0) {
                await dbUpdates.upsertInteraction(
                    payload.contractTxId,
                    id,
                    owner.address,
                    block.height,
                    indexes
                );
            }
        }
    } else {
        throw Error("Wrong message format.");
    }
}