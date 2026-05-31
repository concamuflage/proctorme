"use client"; // Next.js directive to ensure this component is rendered on the client side only (not server-side)

import React, { 
  createContext, // Used to create a new React Context for sharing state globally
  useContext,   // Hook to consume the context value in components
  useEffect,    // Hook to run side effects (e.g. syncing with localStorage)
  useMemo,     // Hook to memoize expensive calculations or objects to optimize performance
  useReducer,  // Hook to manage complex state logic with a reducer function
  useRef      // Hook to persist mutable values across renders without triggering re-renders
} from "react";
import { useSession } from "next-auth/react";
// Represents a single item in the shopping cart with all necessary details and quantity
type CartItem = {
  id: string;
  name: string;
  price: number;
  sessionHours?: number | null;
  startIso?: string | null;
  endIso?: string | null;
  bookingAddressStreet?: string | null;
  bookingAddressCity?: string | null;
  bookingAddressState?: string | null;
  bookingAddressZip?: string | null;
  imageUrl?: string | null;
  color?: string | null;
  size?: string | null;
  qty: number;
};

// Represents the overall state of the cart, including all items and whether the cart UI is open
type CartState = {
  items: CartItem[];
  isOpen: boolean;
  selectedShippingModeId: number | null;
};

// Defines the shape of the context value that will be provided to components consuming the cart context
// Includes cart data and functions to manipulate the cart
type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;
  selectedShippingModeId: number | null;
  itemCount: number; // total quantity of all items
  subtotal: number;  // total price of all items
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  setSelectedShippingModeId: (id: number | null) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
};

// Defines all possible actions that can update the cart state in the reducer
// the vertical bar means or.  the leading vertical bar is just for readability. It can be omitted.

type CartAction =
  // in the reducer, if the it says type = "INIT", it knows the items must exist.

  | { type: "INIT"; items: CartItem[]; selectedShippingModeId: number | null }       // Initialize cart with items and persisted checkout selections
  | { type: "ADD"; item: CartItem }            // Add new item or increase quantity of existing item
  | { type: "REMOVE"; id: string }             // Remove item by id
  | { type: "UPDATE_QTY"; id: string; qty: number } // Update quantity of specific item
  | { type: "SET_SHIPPING_MODE"; id: number | null }
  | { type: "MERGE_ITEMS"; items: Array<Partial<CartItem> & { id: string }> }
  | { type: "CLEAR" }                           // Clear all items from cart
  | { type: "OPEN" }                            // Open the cart UI
  | { type: "CLOSE" }                           // Close the cart UI
  | { type: "TOGGLE" };                         // Toggle cart UI open/closed

// Create the cart context with initial value null.
// Null indicates no default context value and helps detect usage outside provider.
// using createContext, React automatically gives you two components:
// CartContext.Provider and CartContext.Consumer.

const CartContext = createContext<CartContextValue | null>(null);

// a reducer is single place that decides
// “Given the current cart state and an action, what should the next state be?”
// used for updating the state when various actions on the cart is taken.
// dispatch({ type: "ADD", item }),the object parameter is the action

function cartReducer(state: CartState, action: CartAction): CartState {
  // Reducer function updates cart state based on action type and payload
  switch (action.type) {
    case "INIT":
      // Replace current items with those loaded from storage or elsewhere
      return {
        ...state,
        items: action.items,
        selectedShippingModeId: action.selectedShippingModeId,
      };
    case "ADD": {
      // A proctor can only have one active booking in the cart. A new time/address replaces the old one.
      // i is just one item in the array items. If the condition is true, that item will be returned.
      // existing will be CartItem or undefined.
      const [, nextProctorId] = action.item.id.split("-");
      const existing = state.items.find((i) => i.id.split("-")[1] === nextProctorId);

      if (existing) {
        const nextItems = state.items.map((i) => (i.id === existing.id ? action.item : i));
        return { ...state, items: nextItems };
      }

      // Add new item to cart if it doesn't exist yet
      return { ...state, items: [...state.items, action.item] };
    }
    case "REMOVE":
      // Remove item matching given id
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case "UPDATE_QTY": {
      // Ensure quantity is at least 1 to prevent invalid zero or negative quantities
      const qty = Math.max(1, action.qty);
      // { ...i, qty } = {{ ...i, qty : qty }}
      // create an new array of items, so the items state can be updated correctly. in-place change doesn't work.

      const nextItems = state.items.map((i) => (i.id === action.id ? { ...i, qty } : i));
      return { ...state, items: nextItems };
    }
    case "MERGE_ITEMS": {
      const updatesById = new Map(action.items.map((item) => [item.id, item]));
      const nextItems = state.items.map((item) => {
        const update = updatesById.get(item.id);
        return update ? { ...item, ...update } : item;
      });
      return { ...state, items: nextItems };
    }
    case "SET_SHIPPING_MODE":
      return { ...state, selectedShippingModeId: action.id };
    case "CLEAR":
      // Remove all items from cart
      return { ...state, items: [] };
    case "OPEN":
      // Set cart UI to open
      return { ...state, isOpen: true };
    case "CLOSE":
      // Set cart UI to closed
      return { ...state, isOpen: false };
    case "TOGGLE":
      // Toggle cart UI open/closed state
      return { ...state, isOpen: !state.isOpen };
    default:
      return state;
  }
}

// get children field from props.
// the props must contain a field called children
// the following usage will allow all children to access the CartContext.
// CartContext.Provider is different from the following custom CartProvider. 
// CartContext.Provider is provided by React when we created the CartContext.
// <CartContext.Provider value={value}>
//   {children}
// </CartContext.Provider>


export function CartProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  // children represents nested components that will have access to the cart context
  // <CartProvider>
  //   <Header />
  //   <ProductsPage />
  // </CartProvider>

  // useReducer is preferred here over multiple useState calls because cart state is complex and involves multiple related values and actions
  
  // “Create a state object called state, and a function called dispatch that can update that state using cartReducer.”
  // cartReducer is the “rules” function, “When we want to update the cart, use cartReducer to decide the next state.”
  // { items: [], isOpen: false } is used for initializing the state. This object has the same shape as our CartState.
  // CartState is just a TS type, not a state in memory.

  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    isOpen: false,
    selectedShippingModeId: null,
  });
  const cartHydrated = useRef(false);
  const lastSyncedSignature = useRef<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    let cancelled = false;

    const hydrateCart = async () => {
      if (!session?.user) {
        cartHydrated.current = false;
        lastSyncedSignature.current = JSON.stringify({ items: [], shippingId: null });
        dispatch({ type: "INIT", items: [], selectedShippingModeId: null });
        return;
      }

      try {
        const response = await fetch("/api/cart", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (cancelled) return;

        const items = Array.isArray(payload?.items)
          ? payload.items.map((item: CartItem & { weightKg?: number | null }) => ({
              ...item,
              sessionHours: item.sessionHours ?? item.weightKg ?? null,
            }))
          : [];
        const selectedShippingModeId =
          payload?.shippingId == null ? null : Number(payload.shippingId);
        dispatch({ type: "INIT", items, selectedShippingModeId });
        lastSyncedSignature.current = JSON.stringify(
          {
            items: items.map((item: CartItem) => ({
              id: item.id,
              qty: item.qty,
              sessionHours: item.sessionHours ?? null,
              startIso: item.startIso ?? null,
              endIso: item.endIso ?? null,
              bookingAddressStreet: item.bookingAddressStreet ?? null,
              bookingAddressCity: item.bookingAddressCity ?? null,
              bookingAddressState: item.bookingAddressState ?? null,
              bookingAddressZip: item.bookingAddressZip ?? null,
              size: item.size ?? null,
            })),
            shippingId: selectedShippingModeId,
          }
        );
      } catch {
        if (cancelled) return;
        dispatch({ type: "INIT", items: [], selectedShippingModeId: null });
        lastSyncedSignature.current = JSON.stringify({ items: [], shippingId: null });
      } finally {
        if (!cancelled) {
          cartHydrated.current = true;
        }
      }
    };

    void hydrateCart();

    return () => {
      cancelled = true;
    };
  }, [session?.user, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user || !cartHydrated.current) {
      return;
    }

    const payloadItems = state.items.map((item) => ({
      id: item.id,
      qty: item.qty,
      sessionHours: item.sessionHours ?? null,
      startIso: item.startIso ?? null,
      endIso: item.endIso ?? null,
      bookingAddressStreet: item.bookingAddressStreet ?? null,
      bookingAddressCity: item.bookingAddressCity ?? null,
      bookingAddressState: item.bookingAddressState ?? null,
      bookingAddressZip: item.bookingAddressZip ?? null,
      size: item.size ?? null,
    }));
    const signature = JSON.stringify({
      items: payloadItems,
      shippingId: state.selectedShippingModeId,
    });
    if (signature === lastSyncedSignature.current) {
      return;
    }

    let cancelled = false;

    const persistCart = async () => {
      try {
        const response = await fetch("/api/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: payloadItems,
            shippingId: state.selectedShippingModeId,
          }),
        });

        if (!response.ok || cancelled) {
          return;
        }

        lastSyncedSignature.current = signature;
      } catch {
        // Ignore sync errors and keep the in-memory cart.
      }
    };

    void persistCart();

    return () => {
      cancelled = true;
    };
  }, [session?.user, state.items, state.selectedShippingModeId, status]);

  useEffect(() => {
    if (state.items.length === 0) return;

    const proctorIds = Array.from(
      new Set(
        state.items
          .map((item) => {
            const [, proctorId] = item.id.split("-");
            return proctorId;
          })
          .filter((proctorId) => proctorId.length > 0)
      )
    );

    if (proctorIds.length === 0) return;

    let cancelled = false;

    const syncCartProctors = async () => {
      try {
        const proctors = await Promise.all(
          proctorIds.map(async (proctorId) => {
            const res = await fetch(`/api/proctors/${proctorId}`);
            if (!res.ok) return null;
            const data = await res.json();
            return {
              proctorId,
              rateUsd: data?.rateUsd == null ? null : Number(data.rateUsd),
            };
          })
        );

        if (cancelled) return;

        const proctorById = new Map(
          proctors
            .filter(
              (
                proctor
              ): proctor is {
                proctorId: string;
                rateUsd: number | null;
              } => proctor !== null
            )
            .map((proctor) => [proctor.proctorId, proctor])
        );

        const mergedItems = state.items
          .map((item) => {
            const [, proctorId] = item.id.split("-");
            const proctor = proctorById.get(proctorId);
            if (!proctor) return null;

            const selectedHours =
              typeof item.sessionHours === "number" && Number.isFinite(item.sessionHours) && item.sessionHours > 0
                ? item.sessionHours
                : 1;
            const nextSessionHours = selectedHours;
            const nextPrice = proctor.rateUsd == null ? item.price : proctor.rateUsd * selectedHours;

            if (item.sessionHours === nextSessionHours && item.price === nextPrice) return null;

            return {
              id: item.id,
              sessionHours: nextSessionHours,
              price: nextPrice,
            };
          })
          .filter(
            (item): item is { id: string; sessionHours: number; price: number } => item !== null
          );

        if (mergedItems.length > 0) {
          dispatch({ type: "MERGE_ITEMS", items: mergedItems });
        }
      } catch {
        // Ignore fetch errors and keep existing cart contents.
      }
    };

    syncCartProctors();

    return () => {
      cancelled = true;
    };
  }, [state.items]);

  // Memoize the context value to avoid unnecessary re-renders in consuming components
  // itemCount and subtotal are derived values calculated from current cart items
  // Functions dispatch actions to update state, keeping state logic centralized in reducer

  // explanation about the signature.
  // T is the return type.
  //   useMemo<T>(
  //   factory: () => T, factory is a function that computes a value.
  //   deps: DependencyList
  // ): T

  // <CartContextValue> is the return type of useMemo
  const value = useMemo<CartContextValue>(() => {
    //  useMemo caches the result of the function

    // just concise why of looping through the items in the array and accumlate a sum.
    const itemCount = state.items.reduce((sum, item) => sum + item.qty, 0); // 0 the initial value of sum, the running total.
    const subtotal = state.items.reduce((sum, item) => sum + item.price * item.qty, 0);
    // the following is CartContextValue type
    return {
      items: state.items,
      isOpen: state.isOpen,
      selectedShippingModeId: state.selectedShippingModeId,
      itemCount,
      subtotal,
      // the reducer will receive all the actions.
      // dispatch({ type: "ADD", item }) the object parameter is the action

      addItem: (item) => dispatch({ type: "ADD", item }),
      removeItem: (id) => dispatch({ type: "REMOVE", id }),
      updateQty: (id, qty) => dispatch({ type: "UPDATE_QTY", id, qty }),
      setSelectedShippingModeId: (id) => dispatch({ type: "SET_SHIPPING_MODE", id }),
      clearCart: () => dispatch({ type: "CLEAR" }),
      openCart: () => dispatch({ type: "OPEN" }),
      closeCart: () => dispatch({ type: "CLOSE" }),
      toggleCart: () => dispatch({ type: "TOGGLE" }),
    };
    // only recompute if the the following two changed.
  }, [state.items, state.isOpen, state.selectedShippingModeId]);

  //It wraps all child components with a Cart Context, so they can read and modify the cart state using useCart().
  // value is the value returned my useMemo
  // When the value prop of a Context Provider changes (by reference),
  //all components that consume that context will re-render.
  // Components that call useCart() → re-render
	// Components that do NOT use the context → do NOT re-render because of context
  // if a component in Provider doesn't subscribe to context, it will not be re-rendered.
  // value is a prop passed to CartContext.Provider

  // in my layout file, many children were wrapped into the provider.

          // <Providers>
          //   <Header />
          //   {children}
          //   <Footer />
          //   <CartDrawer />
          // </Providers>

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Custom hook to consume cart context easily in components
// Throws an error if used outside CartProvider to help catch bugs early and ensure context is available




export function useCart() {
  //“Give me the current value provided by the nearest <CartContext.Provider> above me in the component tree.”
  // const CartContext = createContext<CartContextValue | null>(null);
  // So before a Provider exists, useContext(CartContext) returns null.
  // If a component wrapped in <CartContext.Provider> calls useCart(), react will look for such a wrapper. 
  // when found, will return the value = {value} of the Provider.
  
  const ctx = useContext(CartContext);// ctx = CartContextValue

  // The component calling useCart() is NOT wrapped inside <CartProvider> in the React component tree.

  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export type { CartItem };
