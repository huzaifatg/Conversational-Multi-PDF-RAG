from backend.services.answer_service import answer_query


if __name__ == "__main__":
    user_query = input("Enter your query: ")
    response = answer_query(user_query)
    print(f"🤖: {response.answer}")
    if response.sources:
        print("Sources:")
        for source in response.sources:
            page = source.page if source.page is not None else "unknown"
            print(f"- {source.file} (Page {page})")