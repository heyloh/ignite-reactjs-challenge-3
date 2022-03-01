import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart")

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productStockResponse = await api.get(`stock/${productId}`);
      const isProductOutOfStock = productStockResponse.data.amount - 1 <= 0;
      if (isProductOutOfStock) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const productAlreadyOnCart = cart.some((product) => product.id === productId);

      let updatedCart;

      if (productAlreadyOnCart) {
        updatedCart = cart.map((product) => product.id === productId ? {
          ...product,
          amount: product.amount + 1
        } : product);
      } else {
        const response = await api.get(`products/${productId}`);
        const product = response.data;
        updatedCart = [...cart, {
          ...product,
          amount: 1
        }];
      }
      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na adição do produto");
      return;
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const isProductOnCart = cart.some((product) => product.id === productId);
      if (!isProductOnCart) {
        toast.error("Erro na remoção do produto");
        return;
      }

      const updatedCart = cart.filter((product) => product.id !== productId);
      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
      return;
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const isProductOnCart = cart.some((product) => product.id === productId);
      if (!isProductOnCart) {
        toast.error("Erro na alteração de quantidade do produto");
        return;
      }

      const productStockResponse = await api.get(`stock/${productId}`);
      const isProductAmountAvailableOnStock = productStockResponse.data.amount >= amount;

      if (!isProductAmountAvailableOnStock) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (amount < 1) {
        return;
      }

      const updatedCart = cart.map((product) => product.id === productId ? {
        ...product,
        amount
      } : product);

      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
      return;
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
