export async function onContractDeployment(payload, dbUpdates) {
    const { tags, contractTxId } = payload;

    const indexesString = tags.find((tag) => tag.name === "Indexed-By");

    if (indexesString) {
        const indexes = indexesString.value.split(";");

        if (indexes.length > 0) {
            await dbUpdates.upsertDeployment(
                contractTxId,
                indexes
            );
        }
    }
}